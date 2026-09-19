package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/pulsepoll/pulsepoll-backend/internal/config"
	"github.com/pulsepoll/pulsepoll-backend/internal/handlers"
	"github.com/pulsepoll/pulsepoll-backend/internal/mongodb"
	"github.com/pulsepoll/pulsepoll-backend/internal/redis"
	"github.com/pulsepoll/pulsepoll-backend/internal/repositories"
	"github.com/pulsepoll/pulsepoll-backend/internal/services"
	wsPkg "github.com/pulsepoll/pulsepoll-backend/internal/websocket"
	"github.com/pulsepoll/pulsepoll-backend/routes"
)

func main() {
	log.Println("==================================================")
	log.Println("  PulsePoll Live Realtime Polling Service Starting")
	log.Println("==================================================")

	cfg := config.LoadConfig()

	// 1. Connect to MongoDB
	mongoClient, err := mongodb.ConnectMongoDB(cfg.MongoURI, cfg.DBName)
	if err != nil {
		log.Fatalf("[Fatal] Failed to connect to MongoDB: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := mongoClient.Client.Disconnect(ctx); err != nil {
			log.Printf("[MongoDB] Disconnect error: %v", err)
		}
	}()

	// 2. Connect to Redis
	redisService, err := redis.ConnectRedis(cfg.RedisURL)
	if err != nil {
		log.Fatalf("[Fatal] Failed to connect to Redis: %v", err)
	}
	defer redisService.Client.Close()

	// 3. Initialize Repositories
	userRepo := repositories.NewUserRepository(mongoClient.Database)
	pollRepo := repositories.NewPollRepository(mongoClient.Database)
	voteRepo := repositories.NewVoteRepository(mongoClient.Database)

	// 4. Initialize Services
	authService := services.NewAuthService(userRepo, cfg.JWTSecret)
	pollService := services.NewPollService(pollRepo, voteRepo, redisService)
	voteService := services.NewVoteService(pollRepo, voteRepo, redisService)

	// 5. Initialize WebSocket Hub
	appCtx, cancelApp := context.WithCancel(context.Background())
	defer cancelApp()

	hub := wsPkg.NewHub(redisService)
	go hub.Run(appCtx)

	// 6. Initialize Handlers
	authHandler := handlers.NewAuthHandler(authService)
	pollHandler := handlers.NewPollHandler(pollService)
	voteHandler := handlers.NewVoteHandler(voteService)
	wsHandler := handlers.NewWebSocketHandler(hub, pollService)

	// 7. Configure Router & Endpoints
	r := routes.SetupRoutes(&routes.RouteConfig{
		AuthHandler:      authHandler,
		PollHandler:      pollHandler,
		VoteHandler:      voteHandler,
		WebSocketHandler: wsHandler,
		JWTSecret:        cfg.JWTSecret,
		FrontendURL:      cfg.FrontendURL,
	})

	// 8. Configure HTTP Server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[Server] Listening on HTTP and WebSockets at port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[Server] Listen error: %v", err)
		}
	}()

	// Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[Server] Shutting down gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[Server] Server forced to shutdown: %v", err)
	}

	log.Println("[Server] PulsePoll exited cleanly.")
}
