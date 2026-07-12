import ReactMarkdown from 'react-markdown';
import React, { useState } from 'react';
import './App.css';

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert analyst and task automation agent. Give responses that match the complexity of the task.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callOpenRouter(prompt, model) {
  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
  };

  // Only gpt-oss-20b has a paid fallback risk, lock it to free provider
  if (model === 'openai/gpt-oss-20b:free') {
    body.provider = { order: ['OpenInference'] };
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

const MODE_MODELS = {
  balanced: 'openai/gpt-oss-20b:free',
  detailed: 'openai/gpt-oss-120b:free',
  code: 'poolside/laguna-xs-2.1:free',
};

function App() {
  const [task, setTask] = useState('');
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState('');
  const [phase, setPhase] = useState('idle');
  const [mode, setMode] = useState('fast'); // 'fast' | 'balanced' | 'detailed' | 'code'

  async function runAgent() {
    if (!task.trim()) return;
    setSteps([]);
    setResult('');
    setPhase('planning');

    try {
      const promptText = `You are a task automation agent. Given this task: "${task}"

Do the following in one response:
1. Break it into 3-4 sub-tasks
2. Execute each sub-task
3. Give a final result

Respond ONLY in this JSON format:
{
  "steps": [
    {"title": "step title", "result": "what this step produces"}
  ],
  "finalResult": "the complete final answer here"
}
No markdown, no explanation, just the JSON.`;

      const response = mode === 'fast'
        ? await callGroq(promptText)
        : await callOpenRouter(promptText, MODE_MODELS[mode]);

      let parsed;
      try {
        const raw = response.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(raw);
      } catch {
        parsed = {
          steps: [{ title: 'Processing', result: 'Task analyzed' }],
          finalResult: response,
        };
      }

      setPhase('executing');
      for (let i = 0; i < parsed.steps.length; i++) {
        setSteps(parsed.steps.slice(0, i + 1).map((s) => ({ ...s, status: 'done' })));
        await new Promise((r) => setTimeout(r, 600));
      }

      setResult(parsed.finalResult);
      setPhase('done');
    } catch (err) {
      setPhase('error');
    }
  }

  function reset() {
    setTask('');
    setSteps([]);
    setResult('');
    setPhase('idle');
  }

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">ClearPath <span className="badge">AI Agent</span></h1>
        <p className="subtitle">Describe anything. ClearPath plans, executes, and delivers results.</p>

        {phase === 'idle' && (
          <div className="input-area">

            <div className="mode-selector">
              <button className={`mode-btn ${mode === 'fast' ? 'active' : ''}`} onClick={() => setMode('fast')}>⚡ Fast</button>
              <button className={`mode-btn ${mode === 'balanced' ? 'active' : ''}`} onClick={() => setMode('balanced')}>⚖️ Balanced</button>
              <button className={`mode-btn ${mode === 'detailed' ? 'active' : ''}`} onClick={() => setMode('detailed')}>🔍 Detailed</button>
              <button className={`mode-btn ${mode === 'code' ? 'active' : ''}`} onClick={() => setMode('code')}>💻 Code</button>
            </div>

            {mode === 'fast' && (
              <div className="mode-warning">⚡ <strong>Fast Mode:</strong> Quick responses via Groq. Results may be less detailed.</div>
            )}
            {mode === 'balanced' && (
              <div className="mode-warning">⚖️ <strong>Balanced Mode:</strong> Good mix of speed and depth.</div>
            )}
            {mode === 'detailed' && (
              <div className="mode-warning">🔍 <strong>Detailed Mode:</strong> Most thorough responses. May take 30-90 seconds.</div>
            )}
            {mode === 'code' && (
              <div className="mode-warning">💻 <strong>Code Mode:</strong> Optimized for programming and technical tasks.</div>
            )}

            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Research the top 5 frameworks for building mobile apps"
              rows={3}
            />
            <button onClick={runAgent} disabled={!task.trim()}>Run Agent</button>
          </div>
        )}

        {phase !== 'idle' && (
          <div className="agent-area">
            <div className="task-pill">🎯 {task}</div>
            {phase === 'planning' && <div className="status">Building plan...</div>}

            {steps.length > 0 && (
              <div className="steps">
                <div className="steps-title">Execution Plan</div>
                {steps.map((step, i) => (
                  <div key={i} className="step step-done">
                    <div className="step-icon">✓</div>
                    <div className="step-content">
                      <div className="step-title">{step.title}</div>
                      {step.result && <div className="step-result">{step.result}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result && (
              <div className="result">
                <div className="result-title">Result</div>
                <div className="result-body">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </div>
            )}

            {phase === 'done' && (
              <button className="reset-btn" onClick={reset}>New Task</button>
            )}

            {phase === 'error' && (
              <div className="error">Something went wrong. <span onClick={reset}>Try again</span></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
