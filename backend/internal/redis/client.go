package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisService struct {
	Client *redis.Client
}

func ConnectRedis(redisURL string) (*RedisService, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		// Fallback to basic Addr if not a full URL
		opts = &redis.Options{
			Addr: redisURL,
		}
	}

	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping redis: %w", err)
	}

	log.Println("[Redis] Successfully connected to Redis instance")
	return &RedisService{Client: client}, nil
}

// IncrementVoteCounter atomically increments the live count for a poll option using HINCRBY
func (r *RedisService) IncrementVoteCounter(ctx context.Context, pollID, optionID string) (int64, error) {
	key := fmt.Sprintf("poll:%s:results", pollID)
	count, err := r.Client.HIncrBy(ctx, key, optionID, 1).Result()
	if err != nil {
		return 0, err
	}
	return count, nil
}

// GetPollCounts retrieves all current vote counts for a poll from the Redis hash
func (r *RedisService) GetPollCounts(ctx context.Context, pollID string) (map[string]int64, int64, error) {
	key := fmt.Sprintf("poll:%s:results", pollID)
	raw, err := r.Client.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, 0, err
	}

	counts := make(map[string]int64)
	var total int64 = 0

	for optID, countStr := range raw {
		val, _ := strconv.ParseInt(countStr, 10, 64)
		counts[optID] = val
		total += val
	}

	return counts, total, nil
}

// InitializePollCounts initializes the Redis hash for a poll if not present
func (r *RedisService) InitializePollCounts(ctx context.Context, pollID string, optionIDs []string) error {
	key := fmt.Sprintf("poll:%s:results", pollID)
	exists, err := r.Client.Exists(ctx, key).Result()
	if err != nil {
		return err
	}
	if exists > 0 {
		return nil // Already initialized
	}

	fields := make(map[string]interface{})
	for _, id := range optionIDs {
		fields[id] = 0
	}

	return r.Client.HSet(ctx, key, fields).Err()
}

// PublishPollEvent publishes a real-time event to the Redis Pub/Sub channel
func (r *RedisService) PublishPollEvent(ctx context.Context, pollID string, payload interface{}) error {
	channel := fmt.Sprintf("poll:%s:events", pollID)
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	return r.Client.Publish(ctx, channel, data).Err()
}

// SubscribePollChannel subscribes to a specific poll's Pub/Sub channel
func (r *RedisService) SubscribePollChannel(ctx context.Context, pollID string) *redis.PubSub {
	channel := fmt.Sprintf("poll:%s:events", pollID)
	return r.Client.Subscribe(ctx, channel)
}
