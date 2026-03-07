import requests
import json
import traceback

class SonicRailAIAgent:
    def __init__(self, ollama_host='http://localhost:11434'):
        self.ollama_host = ollama_host
        self.model = 'llama3'

    def _generate(self, prompt, context=""):
        try:
            full_prompt = f"Context:\n{context}\n\nUser Query: {prompt}" if context else prompt
            
            payload = {
                "model": self.model,
                "prompt": full_prompt,
                "stream": False
            }
            
            response = requests.post(f"{self.ollama_host}/api/generate", json=payload, timeout=30)
            response.raise_for_status()
            
            return response.json().get('response', '')
        except requests.exceptions.RequestException as e:
            print(f"Ollama API Error: {e}")
            return f"Error communicating with local AI Agent. Ensure Ollama is running and '{self.model}' is installed. Details: {e}"
        except Exception as e:
            traceback.print_exc()
            return f"An unexpected error occurred in the AI Agent: {e}"

    def get_system_context(self, engine_state, stress_data):
        """Build a plain-text context string from the current system state."""
        ctx = "Current System State:\n"
        
        ctx += "\n--- Predictive Maintenance (Track Stress) ---\n"
        for km, stress in stress_data.items():
            ctx += f"KM Block {km}: {stress:.1f}% stress\n"
            
        return ctx

    def chat(self, user_message, engine_state, stress_data):
        """Conversational endpoint for the Co-Pilot."""
        context = self.get_system_context(engine_state, stress_data)
        
        system_instructions = (
            "You are the SonicRail Co-Pilot, an AI assistant for human railway operators. "
            "You have access to the real-time system context provided below. "
            "Answer the user's questions based ONLY on this context. Be concise, professional, and helpful. "
            "If they ask about track stress, highlight the blocks with the highest percentages."
        )
        
        full_context = f"{system_instructions}\n\n{context}"
        return self._generate(user_message, full_context)

    def generate_incident_report(self, incident_data, stress_data):
        """Generates a formal 3-paragraph post-mortem report."""
        ctx = f"Incident Details:\n{json.dumps(incident_data, indent=2)}\n\n"
        ctx += f"Track Stress State at time of incident:\n{json.dumps(stress_data, indent=2)}"
        
        prompt = (
            "Write a highly professional, brief executive Post-Mortem Incident Report based on the provided data. "
            "Keep it under 150 words total. "
            "Paragraph 1: Executive summary (what happened, where, AI decision). "
            "Paragraph 2: Telemetry breakdown & recommended rapid response based on track stress. "
            "Do NOT include pleasantries or introductory phrases. Output ONLY the report text."
        )
        
        return self._generate(prompt, ctx)

# Create singleton instance
ai_agent = SonicRailAIAgent()
