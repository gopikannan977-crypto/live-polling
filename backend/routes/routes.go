package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pulsepoll/pulsepoll-backend/internal/handlers"
	"github.com/pulsepoll/pulsepoll-backend/internal/middleware"
)

type RouteConfig struct {
	AuthHandler      *handlers.AuthHandler
	PollHandler      *handlers.PollHandler
	VoteHandler      *handlers.VoteHandler
	WebSocketHandler *handlers.WebSocketHandler
	JWTSecret        string
	FrontendURL      string
}

func SetupRoutes(cfg *RouteConfig) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.CORSMiddleware(cfg.FrontendURL))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "pulsepoll-backend"})
	})

	api := r.Group("/api")
	{
		// Auth endpoints
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/signup", cfg.AuthHandler.Signup)
			authGroup.POST("/login", cfg.AuthHandler.Login)
			authGroup.GET("/me", middleware.AuthRequired(cfg.JWTSecret), cfg.AuthHandler.GetMe)
		}

		// Polls endpoints
		pollsGroup := api.Group("/polls")
		{
			// Public viewing & voting
			pollsGroup.GET("", cfg.PollHandler.GetAllPolls)
			pollsGroup.GET("/:id", cfg.PollHandler.GetPoll)
			pollsGroup.GET("/:id/results", cfg.PollHandler.GetPollResults)
			pollsGroup.POST("/:id/votes", cfg.VoteHandler.CastVote)

			// Protected creator management
			protected := pollsGroup.Group("")
			protected.Use(middleware.AuthRequired(cfg.JWTSecret))
			{
				protected.POST("", cfg.PollHandler.CreatePoll)
				protected.GET("/my", cfg.PollHandler.GetMyPolls)
				protected.POST("/:id/close", cfg.PollHandler.ClosePoll)
				protected.DELETE("/:id", cfg.PollHandler.DeletePoll)
			}
		}

		// WebSocket endpoint under /api/ws/polls/:id
		api.GET("/ws/polls/:id", cfg.WebSocketHandler.HandleWebSocket)
	}

	// Also support top-level /ws/polls/:id
	r.GET("/ws/polls/:id", cfg.WebSocketHandler.HandleWebSocket)

	return r
}
