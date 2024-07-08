import { GameState } from "../game/game-state";
import { action, makeAutoObservable, observable } from "mobx";
import { AssetManager } from "../game/asset-manager";

export class AppState {
  // Observables for UI
  @observable loaded = false;

  gameState?: GameState;

  private assetManager = new AssetManager();

  constructor() {
    makeAutoObservable(this);

    // Give loading UI time to mount
    setTimeout(() => this.loadGame(), 10);
  }

  @action async loadGame() {
    // Load all game assets first
    await this.assetManager.load();

    // Once loaded, start the game immediately
    this.gameState = new GameState(this.assetManager);
    this.loaded = true;
  }
}
