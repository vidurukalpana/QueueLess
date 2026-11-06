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

	authHandler := handlers.NewAuth(db.New(pool))
	router.Post("/api/auth/register", authHandler.Register)

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
