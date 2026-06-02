import { useState } from 'react';
import ModuleCard from './ModuleCard';
import shared from './shared.module.css';
import styles from './AssistantPanel.module.css';
import { api } from '../api/client';

const SUGGESTIONS = [
  'Who should get the next ICU bed and why?',
  'How is the current waitlist prioritized?',
  'Which STEP_DOWN beds are available?',
];

export default function AssistantPanel() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAsk(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setError('');
    setAnswer('');
    setCitations([]);
    setLoading(true);
    try {
      const result = await api.assistant.ask(q);
      setAnswer(result.answer || '(No response)');
      setCitations(result.citations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModuleCard title="Clinical guideline assistant" icon="💬">
      {error && <div className={shared.error}>{error}</div>}

      <div className={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={styles.chip}
            onClick={() => setQuestion(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleAsk}>
        <textarea
          className={shared.textarea}
          placeholder="Ask a question (WHO guideline RAG)…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
        />
        <div className={styles.actions}>
          <button type="submit" className={shared.btnPrimary} disabled={loading || !question.trim()}>
            {loading ? 'Thinking…' : 'Ask'}
          </button>
        </div>
      </form>

      {loading && <p className={shared.loading}>Searching guidelines and generating answer…</p>}

      {answer && (
        <div className={styles.answer}>
          <h3 className={styles.answerTitle}>Answer</h3>
          <div className={styles.answerBody}>{answer}</div>
          {citations.length > 0 && (
            <div className={styles.citations}>
              <h4>Sources</h4>
              <ul>
                {citations.map((c, i) => (
                  <li key={i}>
                    {c.title || c.source || c.id || JSON.stringify(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ModuleCard>
  );
}
