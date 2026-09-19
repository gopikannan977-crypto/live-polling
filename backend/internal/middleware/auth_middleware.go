package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pulsepoll/pulsepoll-backend/internal/auth"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	ContextUserIDKey = "userId"
	ContextEmailKey  = "userEmail"
)

func AuthRequired(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"data":    nil,
				"error":   "Missing Authorization header",
			})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"data":    nil,
				"error":   "Authorization header format must be Bearer <token>",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims, err := auth.ValidateJWT(tokenString, jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"data":    nil,
				"error":   "Invalid or expired token",
			})
			c.Abort()
			return
		}

		objID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"data":    nil,
				"error":   "Malformed user ID in token claim",
			})
			c.Abort()
			return
		}

		c.Set(ContextUserIDKey, objID)
		c.Set(ContextEmailKey, claims.Email)
		c.Next()
	}
}

func GetAuthenticatedUserID(c *gin.Context) (primitive.ObjectID, bool) {
	val, exists := c.Get(ContextUserIDKey)
	if !exists {
		return primitive.NilObjectID, false
	}
	id, ok := val.(primitive.ObjectID)
	return id, ok
}

func GetAuthenticatedEmail(c *gin.Context) (string, bool) {
	val, exists := c.Get(ContextEmailKey)
	if !exists {
		return "", false
	}
	email, ok := val.(string)
	return email, ok
}
