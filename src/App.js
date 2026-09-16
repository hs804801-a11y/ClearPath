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
      model: 'openai/gpt-oss-20b',
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

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_KEY}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'ClearPath AI Agent',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) {
    console.error(`OpenRouter error (${model}):`, data.error);
    throw new Error(data.error.message || `OpenRouter error for ${model}`);
  }
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error(`No content returned from ${model}`);
  }
  return data.choices[0].message.content;
}

const MODE_MODELS = {
  balanced: 'nex-agi/nex-n2.5-mini:free',
  detailed: 'nex-agi/nex-n2.5-mini:free',
  code: 'nex-agi/nex-n2.5-pro:free',
};

function parseAgentResponse(response) {
  if (!response || !response.trim()) {
    return {
      steps: [{ title: 'Completed', result: 'Task executed' }],
      finalResult: 'No content was generated. Please try again.',
    };
  }

  let text = response.trim();
  let parsed = null;

  // 1. Try markdown code block extraction
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonCandidate = codeBlockMatch ? codeBlockMatch[1].trim() : text;

  try {
    parsed = JSON.parse(jsonCandidate);
  } catch {
    // 2. Try slicing between first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {
        // 3. Fallback extraction of finalResult if JSON has unescaped quotes or newlines
        const finalMatch = text.match(/"finalResult"\s*:\s*"([\s\S]*?)"\s*\}?\s*$/);
        if (finalMatch) {
          const stepsMatch = text.match(/"steps"\s*:\s*(\[[\s\S]*?\])\s*,\s*"finalResult"/);
          let steps = [{ title: 'Executed', result: 'Task executed' }];
          if (stepsMatch) {
            try { steps = JSON.parse(stepsMatch[1]); } catch {}
          }
          const cleanFinal = finalMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          return { steps, finalResult: cleanFinal };
        }
      }
    }
  }

  if (parsed && typeof parsed === 'object') {
    let steps = Array.isArray(parsed.steps) && parsed.steps.length > 0
      ? parsed.steps
      : [{ title: 'Execution', result: 'Task completed' }];
    let finalResult = parsed.finalResult || parsed.result || parsed.answer || '';

    // If finalResult is an object or nested JSON string, unwrap it
    if (typeof finalResult === 'object') {
      finalResult = JSON.stringify(finalResult, null, 2);
    } else if (typeof finalResult === 'string' && finalResult.trim().startsWith('{') && finalResult.trim().endsWith('}')) {
      try {
        const inner = JSON.parse(finalResult);
        finalResult = inner.finalResult || inner.answer || inner.result || JSON.stringify(inner, null, 2);
      } catch {}
    }

    if (finalResult) {
      return { steps, finalResult };
    }
  }

  // 4. Fallback: If JSON parsing failed completely, the model outputted plain markdown text!
  const cleaned = text.replace(/^```(?:json|markdown)?\s*|\s*```$/g, '').trim();
  return {
    steps: [{ title: 'Planning', result: 'Analyzed' }, { title: 'Execution', result: 'Completed' }],
    finalResult: cleaned,
  };
}

function App() {
  const [task, setTask] = useState('');
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState('');
  const [phase, setPhase] = useState('idle');
  const [mode, setMode] = useState('fast'); // 'fast' | 'balanced' | 'detailed' | 'code'
  const [errorMessage, setErrorMessage] = useState('');

  async function runAgent() {
    if (!task.trim()) return;
    setSteps([]);
    setResult('');
    setErrorMessage('');
    setPhase('planning');

    try {
      const modeGuidance = mode === 'detailed'
        ? 'Provide an in-depth, thorough, and high-density answer. If creating study plans, schedules, or roadmaps, organize into clear weekly phases or modules with key concepts, practical exercises, and top resources (avoid repetitive day-by-day padding so it delivers quickly).'
        : 'Provide a clear, balanced, and direct response.';

      const promptText = `You are a helpful task automation agent.
User request: "${task}"

Handling instructions:
1. If the request is a simple greeting or casual message (like "hi", "hello", "hey"):
   - Return 1-2 simple sub-tasks (e.g. "Greeting", "Ready for instructions").
   - In "finalResult", give a warm, natural greeting and invite the user to give a task. Do NOT write robotic sections.
2. If the request is an actual task or question:
   - Break it into 3-4 concise, execution-oriented sub-tasks (keep each step result to 1 sharp sentence).
   - In "finalResult", directly deliver the complete, high-quality solution. ${modeGuidance}
   - Never write meta-commentary about the prompt or the agent itself (e.g. do not say "Section 1: Task Interpretation"). Deliver actual results directly.

Respond ONLY in this JSON format:
{
  "steps": [
    {"title": "step title", "result": "1 sentence summary"}
  ],
  "finalResult": "Rich, formatted Markdown response"
}
No markdown outside the JSON, no preamble, only valid JSON.`;

      const response = mode === 'fast'
        ? await callGroq(promptText)
        : await callOpenRouter(promptText, MODE_MODELS[mode]);

      const parsed = parseAgentResponse(response);

      setPhase('executing');
      for (let i = 0; i < parsed.steps.length; i++) {
        setSteps(parsed.steps.slice(0, i + 1).map((s) => ({ ...s, status: 'done' })));
        await new Promise((r) => setTimeout(r, 600));
      }

      setResult(parsed.finalResult);
      setPhase('done');
    } catch (err) {
      console.error('Agent error:', err);
      setErrorMessage(err.message || 'Something went wrong');
      setPhase('error');
    }
  }

  function reset() {
    setTask('');
    setSteps([]);
    setResult('');
    setErrorMessage('');
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
              <div className="error">{errorMessage ? `${errorMessage}. ` : 'Something went wrong. '}<span onClick={reset}>Try again</span></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
