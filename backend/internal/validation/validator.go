package validation

import (
	"errors"
	"net/mail"
	"strings"
)

func ValidateEmail(email string) error {
	trimmed := strings.TrimSpace(email)
	if trimmed == "" {
		return errors.New("email is required")
	}
	_, err := mail.ParseAddress(trimmed)
	if err != nil {
		return errors.New("invalid email address format")
	}
	return nil
}

func ValidatePassword(password string) error {
	if len(password) < 6 {
		return errors.New("password must be at least 6 characters long")
	}
	return nil
}

func ValidatePollInput(question string, options []string) error {
	trimmedQ := strings.TrimSpace(question)
	if len(trimmedQ) < 5 {
		return errors.New("question must be at least 5 characters long")
	}
	if len(trimmedQ) > 200 {
		return errors.New("question cannot exceed 200 characters")
	}

	if len(options) < 2 {
		return errors.New("a poll must have at least 2 options")
	}
	if len(options) > 10 {
		return errors.New("a poll cannot have more than 10 options")
	}

	seen := make(map[string]bool)
	for _, opt := range options {
		trimmedOpt := strings.TrimSpace(opt)
		if len(trimmedOpt) < 1 {
			return errors.New("poll options cannot be empty")
		}
		if len(trimmedOpt) > 100 {
			return errors.New("poll option text cannot exceed 100 characters")
		}
		lower := strings.ToLower(trimmedOpt)
		if seen[lower] {
			return errors.New("duplicate options are not allowed")
		}
		seen[lower] = true
	}

	return nil
}
