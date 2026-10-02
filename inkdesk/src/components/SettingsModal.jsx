import { useState } from 'react';
import Modal from './Modal';
import { getEndpoint, setEndpoint, pingEndpoint } from '../lib/api';

export default function SettingsModal({ onClose, onEndpointChanged }) {
  const [url, setUrl] = useState(getEndpoint());
  const [state, setState] = useState({ testing: false, result: null });

  async function test() {
    const value = url.trim();
    if (!value) {
      setState({ testing: false, result: { ok: false, msg: 'Paste the webhook URL first.' } });
      return;
    }
    setState({ testing: true, result: null });
    try {
      await pingEndpoint(value);
      setState({ testing: false, result: { ok: true, msg: 'Connected — the webhook responded.' } });
    } catch (err) {
      setState({
        testing: false,
        result: { ok: false, msg: err.message || 'Could not reach that URL. Make sure the workflow is active and published, and that it returns CORS headers.' },
      });
    }
  }

  function save(e) {
    e.preventDefault();
    setEndpoint(url);
    onClose();
    onEndpointChanged?.();
  }

  function clearEndpoint() {
    setEndpoint('');
    onClose();
    onEndpointChanged?.();
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label className="field">
          n8n webhook URL
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://n8n.example.com/webhook/inkdesk"
            spellCheck={false}
          />
          <span className="form__hint">
            Paste the production Webhook URL from your n8n workflow. Stored in this browser — or
            bake it into <code>src/lib/config.js</code> for deployments.
          </span>
        </label>
        <div className="form__actions">
          {getEndpoint() && (
            <button type="button" className="btn btn--danger" onClick={clearEndpoint}>
              Clear
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={test} disabled={state.testing}>
            {state.testing ? 'Testing…' : 'Test connection'}
          </button>
          <button type="submit" className="btn btn--solid" disabled={!url.trim()}>
            Save
          </button>
        </div>
        {state.result && (
          <p className={state.result.ok ? 'form__error--ok' : 'form__error'}>{state.result.msg}</p>
        )}
      </form>
    </Modal>
  );
}
