package websocket

import (
	"context"
	"log"
	"sync"

	"github.com/pulsepoll/pulsepoll-backend/internal/redis"
)

type BroadcastMessage struct {
	PollID  string
	Payload []byte
}

type Hub struct {
	clients    map[string]map[*Client]bool
	register   chan *Client
	Unregister chan *Client
	broadcast  chan *BroadcastMessage
	redis      *redis.RedisService
	mu         sync.RWMutex
}

func NewHub(redisService *redis.RedisService) *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		Unregister: make(chan *Client),
		broadcast:  make(chan *BroadcastMessage, 256),
		redis:      redisService,
	}
}

func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

func (h *Hub) BroadcastToPoll(pollID string, payload []byte) {
	h.broadcast <- &BroadcastMessage{
		PollID:  pollID,
		Payload: payload,
	}
}

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			log.Println("[Hub] Shutting down WebSocket hub...")
			return

		case client := <-h.register:
			h.mu.Lock()
			if _, exists := h.clients[client.PollID]; !exists {
				h.clients[client.PollID] = make(map[*Client]bool)
				// Start Redis subscriber for this poll channel if it's the first client
				go h.listenToRedisChannel(ctx, client.PollID)
			}
			h.clients[client.PollID][client] = true
			h.mu.Unlock()
			log.Printf("[Hub] Registered client on poll: %s (Total: %d)", client.PollID, len(h.clients[client.PollID]))

		case client := <-h.Unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.PollID]; ok {
				if _, exists := clients[client]; exists {
					delete(clients, client)
					close(client.Send)
					if len(clients) == 0 {
						delete(h.clients, client.PollID)
					}
					log.Printf("[Hub] Unregistered client from poll: %s", client.PollID)
				}
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			clients := h.clients[message.PollID]
			for client := range clients {
				select {
				case client.Send <- message.Payload:
				default:
					close(client.Send)
					delete(clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// listenToRedisChannel subscribes to poll:{id}:events on Redis Pub/Sub and dispatches incoming messages
func (h *Hub) listenToRedisChannel(ctx context.Context, pollID string) {
	pubsub := h.redis.SubscribePollChannel(ctx, pollID)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			// Broadcast payload received from Redis to all WebSocket clients on this node
			h.BroadcastToPoll(pollID, []byte(msg.Payload))
		}
	}
}
