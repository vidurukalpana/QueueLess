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
	"github.com/vidurukalpana/QueueLess/backend/internal/ws"
)

const (
	readHeaderTimeout = 5 * time.Second
	shutdownTimeout   = 10 * time.Second
	loginsPerMinute   = 5
	joinsPerMinute    = 10
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

	hub := ws.NewHub(cfg.FrontendURL)
	go hub.Run(ctx)

	router := chi.NewRouter()
	router.Use(middleware.SecurityHeaders)
	router.Use(middleware.CORS(cfg.FrontendURL))
	router.Get("/health", handlers.Health(pool))

	queries := db.New(pool)
	authHandler := handlers.NewAuth(queries, cfg.JWTSecret)
	notifier := handlers.NewNotifier(queries, hub)
	queueHandler := handlers.NewQueues(queries, cfg.Location, notifier)
	ticketHandler := handlers.NewTickets(pool, queries, cfg.Location, notifier)
	socketHandler := handlers.NewSocket(queries, hub)
	router.Post("/api/auth/register", authHandler.Register)
	router.With(middleware.RateLimit(loginsPerMinute)).Post("/api/auth/login", authHandler.Login)
	router.Get("/api/queues/{id}", queueHandler.GetPublic)
	router.With(middleware.RateLimit(joinsPerMinute)).Post("/api/queues/{id}/tickets", ticketHandler.Join)
	router.Get("/api/tickets/{id}", ticketHandler.GetStatus)
	router.Delete("/api/tickets/{id}", ticketHandler.Cancel)
	router.Post("/api/tickets/{id}/checkin", ticketHandler.CheckIn)
	router.Get("/ws/queues/{id}", socketHandler.Connect)

	router.Group(func(owner chi.Router) {
		owner.Use(middleware.Authenticate(cfg.JWTSecret))
		owner.Get("/api/auth/me", authHandler.Me)
		owner.Post("/api/queues", queueHandler.Create)
		owner.Get("/api/queues", queueHandler.List)
		owner.Patch("/api/queues/{id}", queueHandler.Update)
		owner.Get("/api/queues/{id}/stats", queueHandler.Stats)
		owner.Post("/api/queues/{id}/join-code", queueHandler.RegenerateJoinCode)
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
