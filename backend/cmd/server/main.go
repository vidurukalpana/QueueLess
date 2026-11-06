package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	// Embeds the time zone database for minimal Docker images.
	_ "time/tzdata"

	"github.com/go-chi/chi/v5"

	"github.com/vidurukalpana/QueueLess/backend/internal/config"
	"github.com/vidurukalpana/QueueLess/backend/internal/db"
	"github.com/vidurukalpana/QueueLess/backend/internal/handlers"
	"github.com/vidurukalpana/QueueLess/backend/internal/middleware"
)

const (
	readHeaderTimeout = 5 * time.Second
	shutdownTimeout   = 10 * time.Second
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.NewPool(ctx, cfg.DatabaseURL, cfg.Location.String())
	if err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}
	defer pool.Close()

	router := chi.NewRouter()
	router.Use(middleware.CORS(cfg.FrontendURL))
	router.Get("/health", handlers.Health(pool))

	queries := db.New(pool)
	authHandler := handlers.NewAuth(queries, cfg.JWTSecret)
	queueHandler := handlers.NewQueues(queries, cfg.Location)
	ticketHandler := handlers.NewTickets(pool, queries, cfg.Location)
	router.Post("/api/auth/register", authHandler.Register)
	router.Post("/api/auth/login", authHandler.Login)
	router.Get("/api/queues/{id}", queueHandler.GetPublic)

	router.Group(func(owner chi.Router) {
		owner.Use(middleware.Authenticate(cfg.JWTSecret))
		owner.Get("/api/auth/me", authHandler.Me)
		owner.Post("/api/queues", queueHandler.Create)
		owner.Get("/api/queues", queueHandler.List)
		owner.Patch("/api/queues/{id}", queueHandler.Update)
		owner.Get("/api/queues/{id}/tickets", ticketHandler.List)
		owner.Post("/api/queues/{id}/next", ticketHandler.CallNext)
		owner.Post("/api/tickets/{id}/skip", ticketHandler.Skip)
		owner.Post("/api/tickets/{id}/done", ticketHandler.Done)
	})

	server := &http.Server{
		Addr:              net.JoinHostPort("0.0.0.0", cfg.Port),
		Handler:           router,
		ReadHeaderTimeout: readHeaderTimeout,
	}

	serveErr := make(chan error, 1)
	go func() {
		log.Printf("listening on %s (time zone %s)", server.Addr, cfg.Location)
		serveErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return fmt.Errorf("serve: %w", err)
	case <-ctx.Done():
	}

	log.Print("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shut down server: %w", err)
	}
	return nil
}
