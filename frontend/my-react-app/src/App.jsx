import { useState } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
} from '@mui/material';
import './App.css';

function App() {

  const [emailContent, setEmailContent] = useState('');
  const [tone, setTone] = useState('');
  const [generatedReply, setGeneratedReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:8080/api/email/generate', {
        emailContent,
        tone,
      });
      // backend returns either a plain string or { reply: "..." } depending on controller -
      // handle both so the UI doesn't break if that changes
      const reply = typeof response.data === 'string' ? response.data : response.data.reply;
      setGeneratedReply(reply || '');
    } catch (err) {
      console.error(err);
      setError('Failed to generate reply. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedReply);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Email Reply Generator
      </Typography>
      <Box sx={{ mx: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={6}
          variant="outlined"
          label="Original email content"
          value={emailContent || ''}
          onChange={(e) => setEmailContent(e.target.value)}
        />

        {/* tone selector dropdown */}
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Tone (Optional)</InputLabel>
          <Select
            value={tone || ''}
            label="Tone (Optional)"
            onChange={(e) => setTone(e.target.value)}
          >
            <MenuItem value="">None</MenuItem>
            <MenuItem value="professional">Professional</MenuItem>
            <MenuItem value="casual">Casual</MenuItem>
            <MenuItem value="friendly">Friendly</MenuItem>
          </Select>
        </FormControl>

        {/* button to generate email reply */}
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={handleSubmit}
          disabled={!emailContent || loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Generate Reply'}
        </Button>

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {/* generated reply output */}
        {generatedReply && (
          <>
            <TextField
              fullWidth
              multiline
              rows={8}
              variant="outlined"
              label="Generated reply"
              value={generatedReply}
              InputProps={{ readOnly: true }}
              sx={{ mt: 3 }}
            />

            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={handleCopy}
            >
              Copy to Clipboard
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
}

export default App;