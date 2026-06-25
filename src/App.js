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

async function callOpenRouter(prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_KEY}`,
    },
    body: JSON.stringify({
      models: [
        'openai/gpt-oss-120b:free',
        'openai/gpt-oss-20b:free',
        'poolside/laguna-xs.2:free',
      ],
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

function App() {
  const [task, setTask] = useState('');
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState('');
  const [phase, setPhase] = useState('idle');
  const [mode, setMode] = useState('fast'); // 'fast' or 'detailed'

  async function runAgent() {
    if (!task.trim()) return;
    setSteps([]);
    setResult('');
    setPhase('planning');

    try {
      const callAI = mode === 'fast' ? callGroq : callOpenRouter;
      const response = await callAI(
        `You are a task automation agent. Given this task: "${task}"

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
No markdown, no explanation, just the JSON.`
      );

      let parsed;
      try {
        const raw = response.replace(/\`\`\`json|\`\`\`/g, '').trim();
        parsed = JSON.parse(raw);
      } catch {
        parsed = {
          steps: [{ title: 'Processing', result: 'Task analyzed' }],
          finalResult: response,
        };
      }

      setPhase('executing');
      for (let i = 0; i < parsed.steps.length; i++) {
        setSteps(parsed.steps.slice(0, i + 1).map((s, idx) => ({
          ...s,
          status: idx === i ? 'done' : 'done',
        })));
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

            {/* Mode Selector */}
            <div className="mode-selector">
              <button
                className={`mode-btn ${mode === 'fast' ? 'active' : ''}`}
                onClick={() => setMode('fast')}
              >
                ⚡ Fast
              </button>
              <button
                className={`mode-btn ${mode === 'detailed' ? 'active' : ''}`}
                onClick={() => setMode('detailed')}
              >
                🔍 Detailed
              </button>
            </div>

            {/* Warning */}
            {mode === 'fast' && (
              <div className="mode-warning">
                ⚡ <strong>Fast Mode:</strong> Quick responses. Results may be less detailed.
              </div>
            )}
            {mode === 'detailed' && (
              <div className="mode-warning">
                🔍 <strong>Detailed Mode:</strong> In-depth responses using advanced models. May take 10-20 seconds longer.
              </div>
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
