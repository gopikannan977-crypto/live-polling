package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/pulsepoll/pulsepoll-backend/internal/models"
	"github.com/pulsepoll/pulsepoll-backend/internal/services"
	wsPkg "github.com/pulsepoll/pulsepoll-backend/internal/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for WebSocket connections in dev/preview
	},
}

type WebSocketHandler struct {
	hub         *wsPkg.Hub
	pollService services.PollService
}

func NewWebSocketHandler(hub *wsPkg.Hub, pollService services.PollService) *WebSocketHandler {
	return &WebSocketHandler{
		hub:         hub,
		pollService: pollService,
	}
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	pollIDStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(pollIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WS] Failed to upgrade connection: %v", err)
		return
	}

	client := &wsPkg.Client{
		Hub:    h.hub,
		Conn:   conn,
		PollID: pollIDStr,
		Send:   make(chan []byte, 256),
	}

	h.hub.RegisterClient(client)

	// Send current poll results immediately upon connection
	go func() {
		poll, err := h.pollService.GetPollByID(c.Request.Context(), pollID)
		if err == nil && poll != nil {
			initEvent := models.RealtimeVoteEvent{
				Type:       "initial_state",
				PollID:     pollIDStr,
				Counts:     poll.Counts,
				TotalVotes: poll.TotalVotes,
				Status:     poll.Status,
				ClosedAt:   poll.ClosedAt,
			}
			data, _ := json.Marshal(initEvent)
			client.Send <- data
		}
	}()

	go client.WritePump()
	go client.ReadPump()
}
