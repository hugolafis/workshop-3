import "./app.scss";

import React from "react";
import { observer } from "mobx-react-lite";

import { AppState } from "./app-state";
import { LoadingScreen } from "../ui/loading-screen/loading-screen";
import { NextChestButton } from "../ui/next-chest-button/next-chest-button";

interface AppProps {
  appState: AppState;
}

export const App: React.FC<AppProps> = observer(({ appState }) => {
  const loaded = appState.loaded;

  return (
    <div id="canvas-root">
      {!loaded && <LoadingScreen />}

      {loaded && (
        <NextChestButton onClick={() => appState.gameState?.nextChest()} />
      )}
    </div>
  );
});
