import { makeElement, render } from "./mini-framework/dom.js";
import { initEventSystem, on } from "./mini-framework/event.js";
import {
  initState,
  useState,
  resetHookIndex,
  getState,
  setState,
} from "./mini-framework/state.js";

const container = document.getElementById("app");
initEventSystem(container);
initState({
  screen: "nickname",
  playerCount: 0,
  timer: null,
  nickname: "",
  hooks: [],
});
const MAP_SIZE = 15;
const ws = new WebSocket("ws://localhost:3000");

ws.onopen = () => {
  console.log("WebSocket connected");
};
ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

function joinGame(nickname, setScreen) {
  console.log("joinGame called with nickname:", nickname);
  if (nickname.trim()) {
    ws.send(JSON.stringify({ type: "join", nickname: nickname.trim() }));
    setScreen("waiting");
  } else {
    console.log("No nickname entered");
    alert("Please enter a nickname");
  }
}

function App() {
  resetHookIndex();
  // const [state, setState] = useState({ screen: 'nickname', playerCount: 0, timer: null, nickname: '' });
  // console.log('Hook index:', callIndex, 'State from useState:', state);
  // console.log('Rendering App with state:', state);
  const state = getState();
  const setAppState = setState;

  if (state.screen === "nickname") {
    return makeElement("div", { id: "nickname-screen" }, [
      makeElement("input", {
        id: "nickname",
        type: "text",
        placeholder: "Enter nickname",
        value: state.nickname,
        oninput: (e) => {
          setAppState({ ...state, nickname: e.target.value });
          console.log("Nickname input:", e.target.value);
        },
      }),
      makeElement(
        "button",
        {
          onclick: () =>
            joinGame(state.nickname, (screen) =>
              setAppState({ ...state, screen })
            ),
        },
        ["Join Game"]
      ),
    ]);
  }

  if (state.screen === "waiting") {
    // console.log('Rendering waiting screen');
    return makeElement("div", { id: "waiting-screen" }, [
      makeElement("p", {}, [
        "Waiting for players: ",
        makeElement("span", { id: "player-count" }, [
          String(state.playerCount),
        ]),
        "/4",
      ]),
      makeElement("p", { id: "timer" }, [
        state.timer !== null ? `Game starts in ${state.timer}s` : "",
      ]),
    ]);
  }

  if (state.screen === "game") {
    console.log("Rendering game screen");
    const mapElements = [];
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        mapElements.push(
          makeElement(
            "div",
            {
              class: state.map[y][x] || "empty",
              style: `position: absolute; left: ${x * 40}px; top: ${
                y * 40
              }px; width: 40px; height: 40px;`,
            },
            []
          )
        );
      }
    }
    const bombElements = (state.bombs || []).map((bomb) =>
      makeElement(
        "div",
        {
          class: "bomb",
          style: `position: absolute; left: ${bomb.x * 40}px; top: ${
            bomb.y * 40
          }px; width: 40px; height: 40px; background: red;`,
        },
        []
      )
    );
    const playerElements = Object.values(state.players || {}).map((player) =>
      makeElement(
        "div",
        {
          class: `player player-${player.id}`,
          style: `position: absolute; left: ${player.x * 40}px; top: ${
            player.y * 40
          }px; width: 40px; height: 40px; background: green; text-align: center; color: white;`,
        },
        [player.nickname]
      )
    );
    return makeElement("div", { id: "game-screen" }, [
      makeElement("div", { id: "game-area" }, [
        ...mapElements,
        ...bombElements,
        ...playerElements,
      ]),
      makeElement("div", { id: "chat" }, [
        makeElement(
          "div",
          { id: "chat-messages" },
          (state.chatMessages || []).map((msg) =>
            makeElement("p", {}, [`${msg.nickname}: ${msg.message}`])
          )
        ),
        makeElement(
          "input",
          {
            id: "chat-input",
            type: "text",
            placeholder: "Type a message",
            onkeypress: (e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                ws.send(
                  JSON.stringify({
                    type: "chat",
                    message: e.target.value.trim(),
                  })
                );
                e.target.value = "";
              }
            },
          },
          []
        ),
      ]),
    ]);
  }

  return makeElement("div", {}, ["Loading..."]);
}

function renderLoop() {
  // console.log('renderLoop called');
  render(App(), container);
  requestAnimationFrame(renderLoop);
}

ws.onmessage = (event) => {
  //   console.log("hello");

  const data = JSON.parse(event.data);
  //   console.log('Client received:', data);
  if (data.type === "playerCount") {
    console.log("Updating player count to:", data.count);
    // console.log("la dinde",setState({ ...getState(), playerCount: data.count }));

    setState({ ...getState(), playerCount: data.count });
  }
  if (data.type === "timer") {
    setState({ ...getState(), timer: data.time });
  }
  if (data.type === "start") {
    console.log("Received start message, setting screen to game");
    setState({
      ...getState(),
      screen: "game",
      map: data.map,
      players: data.players,
    });
  }
  if (data.type === "state") {
    console.log("Updating state with players:", data.players);
    setState({ ...getState(), players: data.players, map: data.map });
  }
};

container.addEventListener("keydown", (e) => {
  console.log("Key pressed:", e.key);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    const direction = e.key.replace("Arrow", "").toLowerCase();
    ws.send(JSON.stringify({ type: "move", id: ws.id, direction }));
    console.log("Sent move:", { id: ws.id, direction });
  } else if (e.key === " ") {
    ws.send(JSON.stringify({ typr: "bomb", id: ws.id }));
  }
});

requestAnimationFrame(renderLoop);
