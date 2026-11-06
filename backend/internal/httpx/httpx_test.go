package httpx

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDecodeJSON(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		wantErr bool
	}{
		{name: "valid object", body: `{"name":"Nimal"}`},
		{name: "invalid json", body: `{"name":`, wantErr: true},
		{name: "unknown field", body: `{"name":"Nimal","admin":true}`, wantErr: true},
		{name: "two objects", body: `{"name":"A"}{"name":"B"}`, wantErr: true},
		{name: "body over limit", body: `{"name":"` + strings.Repeat("a", maxBodyBytes) + `"}`, wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(test.body))
			var target struct {
				Name string `json:"name"`
			}

			err := DecodeJSON(httptest.NewRecorder(), request, &target)

			if test.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, "Nimal", target.Name)
		})
	}
}
