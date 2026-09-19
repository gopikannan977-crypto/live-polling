package tests

import (
	"testing"

	"github.com/pulsepoll/pulsepoll-backend/internal/validation"
)

func TestPollInputValidation(t *testing.T) {
	// Valid poll
	err := validation.ValidatePollInput("What is your favorite cloud database?", []string{"MongoDB", "PostgreSQL", "DynamoDB"})
	if err != nil {
		t.Errorf("Unexpected error for valid poll: %v", err)
	}

	// Question too short (< 5 chars)
	err = validation.ValidatePollInput("Why?", []string{"Option 1", "Option 2"})
	if err == nil {
		t.Errorf("Expected error for question under 5 chars")
	}

	// Too few options (< 2)
	err = validation.ValidatePollInput("Valid question with only one option?", []string{"Single option"})
	if err == nil {
		t.Errorf("Expected error for poll with less than 2 options")
	}

	// Duplicate options
	err = validation.ValidatePollInput("Valid question with duplicates?", []string{"React", "react", "Vue"})
	if err == nil {
		t.Errorf("Expected error for case-insensitive duplicate options")
	}

	// Empty option text
	err = validation.ValidatePollInput("Valid question with empty option?", []string{"Option 1", "   "})
	if err == nil {
		t.Errorf("Expected error for blank option text")
	}
}
