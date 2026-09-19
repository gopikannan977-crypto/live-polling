package tests

import (
	"testing"

	"github.com/pulsepoll/pulsepoll-backend/internal/auth"
	"github.com/pulsepoll/pulsepoll-backend/internal/validation"
)

func TestPasswordHashingAndVerification(t *testing.T) {
	plainPassword := "securePassword123"
	hash, err := auth.HashPassword(plainPassword)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if !auth.CheckPasswordHash(plainPassword, hash) {
		t.Errorf("Expected password to match generated hash")
	}

	if auth.CheckPasswordHash("wrongPassword", hash) {
		t.Errorf("Expected wrong password to fail verification")
	}
}

func TestJWTGenerationAndValidation(t *testing.T) {
	secret := "test-secret-key-32-chars-long-12345"
	userID := "507f1f77bcf86cd799439011"
	email := "test@example.com"

	token, err := auth.GenerateJWT(userID, email, secret)
	if err != nil {
		t.Fatalf("Failed to generate JWT: %v", err)
	}

	claims, err := auth.ValidateJWT(token, secret)
	if err != nil {
		t.Fatalf("Failed to validate valid JWT: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected userID %s, got %s", userID, claims.UserID)
	}

	if claims.Email != email {
		t.Errorf("Expected email %s, got %s", email, claims.Email)
	}

	// Validate with wrong secret
	_, err = auth.ValidateJWT(token, "wrong-secret-key")
	if err == nil {
		t.Errorf("Expected validation failure with incorrect secret")
	}
}

func TestValidationRules(t *testing.T) {
	// Email validation
	if err := validation.ValidateEmail("invalid-email"); err == nil {
		t.Errorf("Expected error for invalid email")
	}
	if err := validation.ValidateEmail("valid.user@example.com"); err != nil {
		t.Errorf("Unexpected error for valid email: %v", err)
	}

	// Password validation
	if err := validation.ValidatePassword("12345"); err == nil {
		t.Errorf("Expected error for password shorter than 6 characters")
	}
	if err := validation.ValidatePassword("123456"); err != nil {
		t.Errorf("Unexpected error for 6-character password: %v", err)
	}
}
