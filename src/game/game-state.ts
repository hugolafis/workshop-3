import * as TWEEN from "@tweenjs/tween.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib";

import { RenderPipeline } from "./render-pipeline";
import { AssetManager } from "./asset-manager";
import { observable } from "mobx";
import { addGui } from "../utils/utils";

/**
 * Flow:
 * - press the Next Chest button
 * - remove previous chest & loot still in scene
 * - generates a new chest and its loot
 * - chest is added to the scene above pedestal
 * - drop animation plays, chest drops onto pedestal
 * - can then interact with the chest (outline on intersect with mouse)
 * - clicking chest plays open animation
 * - loot pops out and falls onto rug
 * - click each loot item (outlined) to make it disappear
 * - left with the empty chest
 */

enum Rarity {
  COMMON = "white",
  UNCOMMON = "green",
  RARE = "blue",
  EPIC = "purple",
  LEGENDARY = "orange",
}

export enum LootType {
  WEAPON,
  POTION,
  SHIELD,
  GOLD,
}

interface LootItem {
  object: THREE.Object3D;
  type: LootType;
  rarity: Rarity;
}

export interface Chest {
  opened: boolean;
  rarity: Rarity;
  lootItems: LootItem[];
}

export class GameState {
  currentChest?: Chest;

  private renderPipeline: RenderPipeline;
  private clock = new THREE.Clock();

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  //private controls: OrbitControls;

  private chest: THREE.Object3D;
  private chestLid: THREE.Object3D;
  private chestPedestalPosition = new THREE.Vector3(-0.1, 0.65, -1.5);
  private chestLidOffset = new THREE.Vector3(0, 0.4, -0.3);
  private chestDropHeight = 4;
  private chestLights: THREE.RectAreaLight[] = [];

  private lootPosLeft = new THREE.Vector3(-1, 0.3, 0.45);
  private lootPosMid = new THREE.Vector3(0, 0.3, 0.45);
  private lootPosRight = new THREE.Vector3(1, 0.3, 0.45);
  private lootRevealDuration = 500;

  private mouseNdc = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();

  private audioListener: THREE.AudioListener;
  private soundMap = new Map<string, THREE.Audio>();

  constructor(private assetManager: AssetManager) {
    // Setup the camera and render pipeline first
    this.setupCamera();
    this.renderPipeline = new RenderPipeline(this.scene, this.camera);

    // Audio
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);
    this.setupAudio();

    // Scene
    this.setupLights();
    this.scene.background = new THREE.Color("#262626");
    this.scene.fog = new THREE.Fog(0xcccccc, 8, 15);

    // Object setup
    const level = assetManager.models.get("level");
    this.scene.add(level);

    this.chest = assetManager.models.get("chest-body");
    assetManager.applyModelTexture(this.chest, "d1-atlas");

    this.chestLid = assetManager.models.get("chest-lid");
    assetManager.applyModelTexture(this.chestLid, "d1-atlas");

    this.chest.add(this.chestLid);
    this.chestLid.position.copy(this.chestLidOffset);

    // Add to scene out of view to start
    this.chest.position.copy(this.chestPedestalPosition);
    this.chest.position.y = 100;
    this.scene.add(this.chest);

    // Testing rect light
    RectAreaLightUniformsLib.init();

    const rectLightDown = new THREE.RectAreaLight(0x00ff00, 3, 1.2, 0.8);
    rectLightDown.position.y += 0.4;
    rectLightDown.rotateX(-Math.PI / 2);

    const rectLightUp = new THREE.RectAreaLight(0x00ff00, 2, 1.2, 0.8);
    rectLightUp.position.y += 0.41;
    rectLightUp.rotateX(Math.PI / 2);

    this.chest.add(rectLightDown, rectLightUp);
    this.chestLights.push(rectLightDown, rectLightUp);

    // Listeners
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseClick);

    // Orbit controls while testing
    // this.controls = new OrbitControls(this.camera, this.renderPipeline.canvas);
    // this.controls.enableDamping = true;
    // this.controls.target.set(0, 1, 0);

    // Start game
    this.update();
  }

  nextChest() {
    // Cannot generate a new chest whilst current is yet to be opened
    if (this.currentChest && !this.currentChest.opened) {
      return;
    }

    // Clear any current chest & loot
    this.cleanupCurrentChest();

    // Generate a new chest & loot
    this.currentChest = this.generateRandomChest();

    // Change chest lights to match rarity
    this.chestLights.forEach((light) =>
      light.color.setColorName(this.currentChest?.rarity ?? "white")
    );

    // Setup drop animation
    this.chest.position.y = this.chestDropHeight;
    const dropAnim = chestDropAnim(this.chest, this.chestPedestalPosition);

    dropAnim.onUpdate(() => {
      this.camera.lookAt(this.chest.position);
    });

    dropAnim.onComplete(() => {
      this.playAudio("chest-impact");
    });

    dropAnim.start();
  }

  private setupCamera() {
    this.camera.fov = 50;
    this.camera.far = 500;
    this.camera.near = 0.1;
    this.camera.position.set(0, 2.65, 6);
    this.camera.lookAt(-0.1, 1.45, -0.1);
  }

  private setupAudio() {
    const audioBuffers = this.assetManager.audioBuffers;

    const chestImpactSound = new THREE.Audio(this.audioListener);
    chestImpactSound.setBuffer(audioBuffers.get("chest-impact"));
    this.soundMap.set("chest-impact", chestImpactSound);

    const chestOpenSound = new THREE.Audio(this.audioListener);
    chestOpenSound.setBuffer(audioBuffers.get("chest-open"));
    this.soundMap.set("chest-open", chestOpenSound);

    const bottleSound = new THREE.Audio(this.audioListener);
    bottleSound.setBuffer(audioBuffers.get("pick-up-potion"));
    this.soundMap.set("pick-up-potion", bottleSound);

    const shieldSound = new THREE.Audio(this.audioListener);
    shieldSound.setBuffer(audioBuffers.get("pick-up-shield"));
    this.soundMap.set("pick-up-shield", shieldSound);

    const goldSound = new THREE.Audio(this.audioListener);
    goldSound.setBuffer(audioBuffers.get("pick-up-gold"));
    this.soundMap.set("pick-up-gold", goldSound);

    const weaponSound = new THREE.Audio(this.audioListener);
    weaponSound.setBuffer(audioBuffers.get("pick-up-weapon"));
    this.soundMap.set("pick-up-weapon", weaponSound);
  }

  private playAudio(name: string) {
    const sound = this.soundMap.get(name);
    sound?.stop().play();
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(undefined, 0.15);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directLight.position.copy(new THREE.Vector3(0.75, 1, 0.75).normalize());
    this.scene.add(directLight);

    const flameColour = new THREE.Color("#f59002").convertSRGBToLinear();
    const flameLeft = new THREE.PointLight(flameColour, 5, 5);
    flameLeft.position.set(-1.62, 3.2, -2.35);

    const flameRight = new THREE.PointLight(flameColour, 5, 5);
    flameRight.position.set(1.62, 3.2, -2.35);

    this.scene.add(flameLeft, flameRight);

    lightFlicker(flameLeft).start();
    lightFlicker(flameRight).start();
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    //this.controls.update();

    TWEEN.update();

    if (this.currentChest) {
      const elapsed = this.clock.getElapsedTime();

      this.currentChest.lootItems.forEach((lootItem) => {
        // Rotate the object
        lootItem.object.rotation.y += dt * 0.5;

        // Bob up and down
        lootItem.object.position.y += Math.sin(elapsed) * 0.001;
      });
    }

    this.renderPipeline.render(dt);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.currentChest) {
      return;
    }

    // Set normalised device coords of cursor
    this.mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNdc, this.camera);

    // Clear any outlines from previous frame
    this.renderPipeline.clearOutlines();
    document.body.style.cursor = "default";

    // If the chest is yet to be opened, raycast against that
    if (!this.currentChest.opened) {
      const intersects = this.raycaster.intersectObject(this.chest);
      if (intersects.length) {
        // Outline the chest
        this.renderPipeline.outlineObject(this.chest);
        document.body.style.cursor = "pointer";
      }
      return;
    }

    // Otherwise, raycast against remaining loot objects
    if (this.currentChest.lootItems.length) {
      const objects = this.currentChest.lootItems.map((item) => item.object);

      const intersects = this.raycaster.intersectObjects(objects);
      if (intersects.length) {
        const objectHit = intersects[0].object;
        this.renderPipeline.outlineObject(objectHit);
        document.body.style.cursor = "pointer";
      }
    }
  };

  private onMouseClick = (e: MouseEvent) => {
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);

    // Determine if clicking on the chest
    if (!this.currentChest?.opened) {
      const intersects = this.raycaster.intersectObject(this.chest);
      if (intersects.length) {
        this.openChest();
      }

      return;
    }

    // Determine if clicking on a loot object
    for (const [index, lootItem] of this.currentChest.lootItems.entries()) {
      const intersects = this.raycaster.intersectObject(lootItem.object);
      if (intersects.length) {
        this.pickupLootItem(lootItem, index);

        return;
      }
    }
  };

  private cleanupCurrentChest() {
    // Close the chest lid
    this.chestLid.rotation.x = 0;

    // Remove any remaining loot objects
    this.currentChest?.lootItems.forEach((lootItem) => {
      this.scene.remove(lootItem.object);
    });

    this.currentChest = undefined;
  }

  private generateRandomChest(): Chest {
    // First pick 3 loot items of random loot types
    const lootTypes = [
      LootType.GOLD,
      LootType.POTION,
      LootType.SHIELD,
      LootType.WEAPON,
    ];
    const randomTypes: LootType[] = [];
    for (let i = 0; i < 3; i++) {
      randomTypes.push(lootTypes[Math.floor(Math.random() * lootTypes.length)]);
    }

    const { lootMap, models } = this.assetManager;
    const rarities = Object.values(Rarity);

    // Then create the items each with a random rarity
    const lootItems: LootItem[] = randomTypes.map((type) => {
      // Random object of this type
      const names = lootMap.get(type) ?? ["coins"];
      const name = names[Math.floor(Math.random() * names.length)];
      const object = models.get(name).clone();

      // Random texture (except gold!)
      const textureName =
        type === LootType.GOLD
          ? "d1-atlas"
          : `d${THREE.MathUtils.randInt(1, 4)}-atlas`;
      this.assetManager.applyModelTexture(object, textureName);

      // Random rarity
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];

      return {
        object,
        rarity,
        type,
      };
    });

    // The chest rarity is that of the rarest loot item
    let highestRarityIndex = 0;
    lootItems.forEach((item) => {
      const index = rarities.findIndex((rarity) => item.rarity === rarity);
      if (index > highestRarityIndex) {
        highestRarityIndex = index;
      }
    });

    const chestRarity = rarities[highestRarityIndex];

    return {
      lootItems,
      rarity: chestRarity,
      opened: false,
    };
  }

  private openChest() {
    if (!this.currentChest) {
      return;
    }

    // Treat as opened immediately to avoid re-triggering open anim
    this.currentChest.opened = true;

    // Get the chest open anim
    const openDuration = 500;
    const openAnim = chestOpenAnim(this.chestLid, openDuration);

    // Get the loot reveal anims
    const lootObjects = this.currentChest.lootItems;
    const lootRevealAnims = this.getLootRevealAnims(
      lootObjects[0].object,
      lootObjects[1].object,
      lootObjects[2].object
    );

    // Loot starts at scale 0, then scales up as it's revealed
    lootObjects.forEach((item) => item.object.scale.set(0, 0, 0));
    const lootScaleAnims = this.getLootScaleAnims(
      lootObjects[0].object,
      lootObjects[1].object,
      lootObjects[2].object
    );

    // Add the loot to the scene
    this.currentChest.lootItems.forEach((item) => this.scene.add(item.object));

    // Start all the anims
    openAnim.start();
    lootRevealAnims.forEach((tween) => tween.start());
    lootScaleAnims.forEach((tween) => tween.start());

    this.playAudio("chest-open");
  }

  private getLootRevealAnims(
    leftObject: THREE.Object3D,
    midObject: THREE.Object3D,
    rightObject: THREE.Object3D
  ) {
    // Position them for the start of the animation
    leftObject.position.copy(this.chest.position);
    midObject.position.copy(this.chest.position);
    rightObject.position.copy(this.chest.position);

    // Create a curve path leading to rug pos
    const leftPath = this.getCurvePathTo(this.chest.position, this.lootPosLeft);
    const midPath = this.getCurvePathTo(this.chest.position, this.lootPosMid);
    const rightPath = this.getCurvePathTo(
      this.chest.position,
      this.lootPosRight
    );

    // Return the animations for each object
    const leftAnim = followPathAnim(
      leftObject,
      leftPath,
      this.lootRevealDuration
    );
    const midAnim = followPathAnim(midObject, midPath, this.lootRevealDuration);
    const rightAnim = followPathAnim(
      rightObject,
      rightPath,
      this.lootRevealDuration
    );

    return [leftAnim, midAnim, rightAnim];
  }

  private getCurvePathTo(from: THREE.Vector3, to: THREE.Vector3) {
    // Get the mid point between from and to
    const mid = to.clone().sub(from).multiplyScalar(0.5).add(from);
    mid.y += 2;

    const curve = new THREE.CatmullRomCurve3([from, mid, to]);

    return curve.getPoints(10);
  }

  private getLootScaleAnims(
    leftObject: THREE.Object3D,
    midObject: THREE.Object3D,
    rightObject: THREE.Object3D
  ) {
    const scaleDuration = this.lootRevealDuration * 0.5;
    const leftAnim = scaleAnim(leftObject, scaleDuration);
    const midAnim = scaleAnim(midObject, scaleDuration);
    const rightAnim = scaleAnim(rightObject, scaleDuration);

    return [leftAnim, midAnim, rightAnim];
  }

  private pickupLootItem(item: LootItem, index: number) {
    // Play sfx for this type of object
    switch (item.type) {
      case LootType.GOLD:
        this.playAudio("pick-up-gold");
        break;
      case LootType.POTION:
        this.playAudio("pick-up-potion");
        break;
      case LootType.SHIELD:
        this.playAudio("pick-up-shield");
        break;
      case LootType.WEAPON:
        this.playAudio("pick-up-weapon");
        break;
    }

    // Remove the object
    this.scene.remove(item.object);
    this.currentChest?.lootItems.splice(index, 1);
  }
}

function chestDropAnim(chest: THREE.Object3D, to: THREE.Vector3) {
  const tween = new TWEEN.Tween(chest)
    .to(
      {
        position: { y: to.y },
      },
      350
    )
    .easing(TWEEN.Easing.Circular.In);

  return tween;
}

function chestOpenAnim(chestLid: THREE.Object3D, duration: number) {
  // Lid rotates backwards along x axis
  const tween = new TWEEN.Tween(chestLid)
    .to(
      {
        rotation: { x: -Math.PI / 1.5 },
      },
      duration
    )
    .easing(TWEEN.Easing.Bounce.Out);

  return tween;
}

function followPathAnim(
  object: THREE.Object3D,
  path: THREE.Vector3[],
  duration: number
) {
  const stepDuration = duration / path.length;

  // Create the tweens for each waypoint
  const waypointTweens: TWEEN.Tween<THREE.Object3D>[] = [];
  path.forEach((waypoint) => {
    const thisTween = new TWEEN.Tween(object).to(
      {
        position: { x: waypoint.x, y: waypoint.y, z: waypoint.z },
      },
      stepDuration
    );

    waypointTweens.push(thisTween);
  });

  // Chain them all together (go backwards so we end up with the first)
  for (let i = waypointTweens.length - 2; i >= 0; i--) {
    const thisTween = waypointTweens[i];
    const prevTween = waypointTweens[i + 1];

    thisTween.chain(prevTween);
  }

  return waypointTweens[0];
}

function scaleAnim(object: THREE.Object3D, duration: number) {
  const tween = new TWEEN.Tween(object).to(
    {
      scale: { x: 1, y: 1, z: 1 },
    },
    duration
  );

  return tween;
}

function lightFlicker(light: THREE.PointLight) {
  const tween = new TWEEN.Tween(light)
    .onEveryStart(() => {
      // Set a random clamped duration
      tween.duration(THREE.MathUtils.randFloat(1000, 3000));
    })
    .to({
      intensity: 2,
    })
    .repeat(Infinity)
    .yoyo(true);

  return tween;
}
