import { makeElement, render } from './mini-framework/dom.js';
import { initEventSystem, on } from './mini-framework/event.js';
import { initState, useState, resetHookIndex, getState, setState } from './mini-framework/state.js';

const container = document.getElementById('app');
initEventSystem(container);
initState({ screen: 'nickname', playerCount: 0, timer: null, nickname: '', hooks: [] });

const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('WebSocket connected');
};
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

function joinGame(nickname, setScreen) {
  console.log('joinGame called with nickname:', nickname);
  if (nickname.trim()) {
    ws.send(JSON.stringify({ type: 'join', nickname: nickname.trim() }));
    setScreen('waiting');
  } else {
    console.log('No nickname entered');
    alert('Please enter a nickname');
  }
}

function App() {
  resetHookIndex();
  const [state, setState] = useState({ screen: 'nickname', playerCount: 0, timer: null, nickname: '' });
  // console.log('Rendering App with state:', state);

  if (state.screen === 'nickname') {
    return makeElement('div', { id: 'nickname-screen' }, [
      makeElement('input', {
        id: 'nickname',
        type: 'text',
        placeholder: 'Enter nickname',
        value: state.nickname,
        oninput: (e) => {
          setState({ ...state, nickname: e.target.value });
          console.log('Nickname input:', e.target.value);
        }
      }),
      makeElement('button', {
        onclick: () => joinGame(state.nickname, (screen) => setState({ ...state, screen }))
      }, ['Join Game'])
    ]);
  }

  if (state.screen === 'waiting') {
    // console.log('Rendering waiting screen');
    return makeElement('div', { id: 'waiting-screen' }, [
      makeElement('p', {}, [
        'Waiting for players: ',
        makeElement('span', { id: 'player-count' }, [String(state.playerCount)]),
        '/4'
      ]),
      makeElement('p', { id: 'timer' }, [
        state.timer !== null ? `Game starts in ${state.timer}s` : ''
      ])
    ]);
  }

  if (state.screen === 'game') {
    console.log('Rendering game screen');
    return makeElement('div', { id: 'game-screen' }, [
      makeElement('div', { id: 'game-area' }, []),
      makeElement('div', { id: 'chat' }, [
        makeElement('div', { id: 'chat-messages' }, []),
        makeElement('input', { id: 'chat-input', type: 'text', placeholder: 'Type a message' }, [])
      ])
    ]);
  }

  return makeElement('div', {}, ['Loading...']);
}

function renderLoop() {
  // console.log('renderLoop called');
  render(App(), container);
  requestAnimationFrame(renderLoop);
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Client received:', data);
  if (data.type === 'playerCount') {
    console.log('Updating player count to:', data.count);
    setState({ ...getState(), playerCount: data.count });
  }
  if (data.type === 'timer') {
    setState({ ...getState(), timer: data.time });
  }
  if (data.type === 'start') {
    console.log('Received start message, setting screen to game');
    setState({ ...getState(), screen: 'game', map: data.map, players: data.players });
  }
};

requestAnimationFrame(renderLoop);