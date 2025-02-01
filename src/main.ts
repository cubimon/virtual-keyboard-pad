import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

async function sendKey(
    key: string,
    state: KeyState) {
  return invoke('send_key', {
    key: key,
    state: state,
  });
}

async function triggerHapticPulse(pad: number) {
  return invoke('trigger_haptic_pulse', {
    pad: pad
  });
}

async function log(level: string, message: string) {
  return invoke('log', {
    level: level,
    message: message,
  });
}

interface Area {
  top: number;
  left: number;
  width: number;
  height: number;
}

const config = {
  cursor: {
    forceThreshold: 2000,
    area: {
      left: {
        top: 0.4,
        left: -0.05,
        width: 0.7,
        height: 0.7
      },
      right: {
        top: 0.4,
        left: 0.35,
        width: 0.7,
        height: 0.7
      },
    }
  }
};
const cursorSize = parseInt(getComputedStyle(document.body).getPropertyValue('--cursorsize').split('px')[0], 10);


const keyboardLayout = {
  'type': 'column',
  'elements': [
    {
      'type': 'row',
      'elements': [
        { key: 'escape', label: 'ESC' },
        { key: '1' },
        { key: '2' },
        { key: '3' },
        { key: '4' },
        { key: '5' },
        { key: '6' },
        { key: '7' },
        { key: '8' },
        { key: '9' },
        { key: '0' },
        { key: '-' },
        { key: '=' },
        { key: 'backspace', label: 'Backspace', size: 'u2' },
        { key: 'delete', label: 'Del' }
      ]
    },
    {
      'type': 'row',
      'elements': [
        { key: 'tab', label: 'Tab', size: 'u1_5' },
        { key: 'q', label: 'Q' },
        { key: 'w', label: 'W' },
        { key: 'e', label: 'E' },
        { key: 'r', label: 'R' },
        { key: 't', label: 'T' },
        { key: 'y', label: 'Y' },
        { key: 'u', label: 'U' },
        { key: 'i', label: 'I' },
        { key: 'o', label: 'O' },
        { key: 'p', label: 'P' },
        { key: '[' },
        { key: ']' },
        { key: '\\', size: 'u1_5' },
        { key: 'home' }
      ]
    },
    {
      'type': 'row',
      'elements': [
        { key: 'capslock', label: 'Caps Lock', size: 'u1_75' },
        { key: 'a', label: 'A' },
        { key: 's', label: 'S' },
        { key: 'd', label: 'D' },
        { key: 'f', label: 'F' },
        { key: 'g', label: 'G' },
        { key: 'h', label: 'H' },
        { key: 'j', label: 'J' },
        { key: 'k', label: 'K' },
        { key: 'l', label: 'L' },
        { key: ';' },
        { key: '\'' },
        { key: 'return', label: 'Enter', size: 'u2_25' },
        { key: 'page_up', label: 'Pgup' }
      ]
    },
    {
      'type': 'row',
      'elements': [
        { key: 'shift', label: 'Shift', size: 'u2_25', type: 'osm' },
        { key: 'z', label: 'Z' },
        { key: 'x', label: 'X' },
        { key: 'c', label: 'C' },
        { key: 'v', label: 'V' },
        { key: 'b', label: 'B' },
        { key: 'n', label: 'N' },
        { key: 'm', label: 'M' },
        { key: ',' },
        { key: '.' },
        { key: '/' },
        { key: 'shift', label: 'Shift', size: 'u1_75', type: 'osm' },
        { key: 'up_arrow', label: '⬆️' },
        { key: 'page_down', label: 'Pgdn' }
      ]
    },
    {
      'type': 'row',
      'elements': [
        { key: 'control', label: 'Ctrl', size: 'u1_25', type: 'osm' },
        { key: 'meta', size: 'u1_25', type: 'osm' },
        { key: 'alt', label: 'Alt', size: 'u1_25', type: 'osm' },
        { key: 'space', label: '', size: 'u6_25' },
        { key: 'alt', label: 'Alt', type: 'osm' },
        { key: null, label: '' },
        { key: null, label: '' },
        { key: 'left_arrow', label: '⬅️' },
        { key: 'down_arrow', label: '⬇️' },
        { key: 'right_arrow', label: '➡️' }
      ]
    },
  ]
};

type KeyState = 'down' | 'up';

class KeyboardStateChange {
  key: KeyboardKey;
  state: KeyState;
  time: Date;

  constructor(
      key: KeyboardKey,
      state: KeyState,
      now: Date) {
    this.key = key;
    this.state = state;
    this.time = now;
  }
}

type KeyStateChangeListener = (
  key: KeyboardKey,
  state: KeyState,
  now: Date) => void;

class KeyboardState {

  pressedLeftKeys: KeyboardKey[] = [];
  pressedRightKeys: KeyboardKey[] = [];

  hoveredLeftKeys: KeyboardKey[] = [];
  hoveredRightKeys: KeyboardKey[] = [];

  keyboardStateChanges: KeyboardStateChange[] = [];

  beforeKeyStateChangeListener: KeyStateChangeListener[] = [];
  afterKeyStateChangeListener: KeyStateChangeListener[] = [];

  heldOsmKeys: Set<KeyboardKeyOsm> = new Set();

  isOsmShifted(): boolean {
    for (let heldOsmKey of this.heldOsmKeys) {
      if (heldOsmKey.isShift()) {
        return true;
      }
    }
    return false;
  }

  isShifted(): boolean {
    if (this.isOsmShifted()) {
      return true;
    }
    for (let pressedLeftKey of this.pressedLeftKeys) {
      if (pressedLeftKey.isShift()) {
        return true;
      }
    }
    for (let pressedRightKey of this.pressedRightKeys) {
      if (pressedRightKey.isShift()) {
        return true;
      }
    }
    return false;
  }

  async keyStateChanges(
      keys: KeyboardKey[],
      state: KeyState,
      now: Date) {
    keys.forEach(async key => {
      await this.keyStateChange(key, state, now);
    });
  }

  async keyStateChange(
      key: KeyboardKey,
      state: KeyState,
      now: Date) {
    this.publishBeforeKeyStateChange(key, state, now);
    this.updateHistory(key, state, now);
    const result = await key.keyStateChange(state, now);
    this.publishAfterKeyStateChange(key, state, now);
    return result;
  }

  publishBeforeKeyStateChange(
      key: KeyboardKey,
      state: KeyState,
      now: Date) {
    this.beforeKeyStateChangeListener.forEach(listener => {
      listener(key, state, now);
    })
  }

  publishAfterKeyStateChange(
      key: KeyboardKey,
      state: KeyState,
      now: Date) {
    this.afterKeyStateChangeListener.forEach(listener => {
      listener(key, state, now);
    })
  }

  subscribeBeforeKeyStateChange(
      listener: KeyStateChangeListener) {
    this.beforeKeyStateChangeListener.push(listener);
  }

  subscribeAfterKeyStateChange(
      listener: KeyStateChangeListener) {
    this.afterKeyStateChangeListener.push(listener);
  }

  holdOsmKey(key: KeyboardKeyOsm) {
    this.heldOsmKeys.add(key);
  }

  unholdOsmKey(key: KeyboardKeyOsm) {
    this.heldOsmKeys.delete(key);
  }

  updateHistory(
      key: KeyboardKey,
      state: KeyState,
      now: Date) {
    this.keyboardStateChanges.push(
      new KeyboardStateChange(key, state, now));
    this.keyboardStateChanges = this.keyboardStateChanges.filter(
      keyStateChange => now.getTime() - keyStateChange.time.getTime() < 2000);
  }
}

class KeyboardKey extends HTMLElement {

  button?: HTMLElement;
  keyboardState: KeyboardState;
  key: string;
  label: string;

  constructor(
      keyboardState: KeyboardState,
      key: string,
      label: string) {
    super();
    this.keyboardState = keyboardState;
    this.key = key;
    this.label = label ?? key;
    this.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  async onMouseDown() {
    await this.keyboardState.keyStateChange(
      this, 'down', new Date());
  }

  async onMouseUp() {
    await this.keyboardState.keyStateChange(
      this, 'up', new Date());
  }

  connectedCallback() {
    this.button = document.createElement('button');
    this.button.innerText = this.label;
    this.appendChild(this.button);
  }

  disconnectedCallback() {
    this.innerHTML = '';
  }

  isShift(): boolean {
    return this.key === 'shift';
  }

  async keyStateChange(
      state: KeyState,
      _now: Date) {
    let keyChar = this.key;
    if (this.keyboardState.isShifted()) {
      keyChar = keyChar.toUpperCase();
    }
    return sendKey(keyChar, state);
  }
}

class KeyboardKeyOsm extends KeyboardKey {

  isHeld: boolean;

  constructor(
      keyboardState: KeyboardState,
      key: string,
      label: string) {
    super(keyboardState, key, label);
    this.isHeld = false;
    this.keyboardState.subscribeAfterKeyStateChange(
      this.afterKeyStateChange.bind(this));
  }

  afterKeyStateChange(
      key: KeyboardKey,
      _state: KeyState,
      _now: Date) {
    if (key instanceof KeyboardKeyOsm) {
      return;
    }
    if (this.isHeld) {
      sendKey(this.key, 'up');
      this.isHeld = false;
      this.keyboardState.unholdOsmKey(this);
    }
  }

  async keyStateChange(
      state: KeyState,
      now: Date) {
    if (this.isHeld) {
      return;
    }
    let result = super.keyStateChange(state, now);
    this.isHeld = true;
    this.keyboardState.holdOsmKey(this);
    return result;
  }
}

if ('customElements' in window) {
  window.customElements.define('keyboard-key', KeyboardKey, { extends: 'button' });
  window.customElements.define('keyboard-key-osm', KeyboardKeyOsm, { extends: 'button' });
}

function isKey(object: any) {
  if ('key' in object) {
    return true;
  }
}

function isLayout(object: any) {
  return ['row', 'column'].includes(object?.type) && Array.isArray(object?.elements);
}

function renderKey(
    keyboardState: KeyboardState,
    object: any): HTMLElement {
  let result = null;
  switch(object?.type) {
    case 'osm':
      result = new KeyboardKeyOsm(keyboardState,
        object?.key,
        object?.label);
      break;
    case 'layer':
    default:
      result = new KeyboardKey(
        keyboardState,
        object?.key,
        object?.label);
  }
  result.classList.add(object?.key);
  result.classList.add('key');
  if (object?.size) {
    result.classList.add(object.size);
  } else {
    result.classList.add('u1');
  }
  if (object?.id) {
    result.id = object.id;
  }
  return result;
}

function renderRowLayout(
    keyboardState: KeyboardState,
    object: any): HTMLElement {
  const result = document.createElement('div');
  result.className = 'row';
  for (const element of object?.elements ?? []) {
    const renderedElement = renderKeyboardLayoutElement(
      keyboardState, element)
    if (renderedElement) {
      result.appendChild(renderedElement);
    }
  }
  return result;
}

function renderColumnLayout(
    keyboardState: KeyboardState,
    object: any): HTMLElement {
  const result = document.createElement('div');
  result.className = 'column';
  for (const element of object?.elements ?? []) {
    const renderedElement = renderKeyboardLayoutElement(
      keyboardState, element)
    if (renderedElement) {
      result.appendChild(renderedElement);
    }
  }
  return result;
}

function renderKeyboardLayoutElement(
    keyboardState: KeyboardState,
    object: any): HTMLElement | undefined {
  if (isKey(object)) {
    return renderKey(keyboardState, object);
  }
  if (isLayout(object)) {
    if (object.type === 'row') {
      return renderRowLayout(
        keyboardState, object);
    } else if (object.type === 'column') {
      return renderColumnLayout(
        keyboardState, object);
    }
  }
}

function handleHoveredKeys(
    keyboardState: KeyboardState,
    leftKeys: KeyboardKey[],
    rightKeys: KeyboardKey[]) {
  // left
  const releasedLeftKeys = keyboardState.hoveredLeftKeys.filter(
    prevHovKey => leftKeys.indexOf(prevHovKey) < 0);
  const newHoveredLeftKeys = leftKeys.filter(
    newHovKey => keyboardState.hoveredLeftKeys.indexOf(newHovKey) < 0);
  // right
  const releasedRightKeys = keyboardState.hoveredRightKeys.filter(
    prevHovKey => rightKeys.indexOf(prevHovKey) < 0);
  const newHoveredRightKeys = rightKeys.filter(
    newHovKey => keyboardState.hoveredRightKeys.indexOf(newHovKey) < 0);
  [...newHoveredLeftKeys, ...newHoveredRightKeys].forEach((key) => {
    key.classList.add('cursor-hover');
  });
  [...releasedLeftKeys, ...releasedRightKeys].forEach((key) => {
    key.classList.remove('cursor-hover');
  });
  // if new keys are hovered/cursor moved to new key, send haptic feedback
  if (newHoveredLeftKeys.length != 0) {
    triggerHapticPulse(1);
  }
  if (newHoveredRightKeys.length != 0) {
    triggerHapticPulse(0);
  }
  keyboardState.hoveredLeftKeys = leftKeys;
  keyboardState.hoveredRightKeys = rightKeys;
}

function getKeys(x: number, y: number): KeyboardKey[] {
  const elements = document.elementsFromPoint(x, y);
  const keys = elements.filter(element => element.nodeName.startsWith('KEYBOARD-KEY'));
  return keys.filter(key => key instanceof KeyboardKey);
}

interface SteamDeckDeviceReport {
    lPadX: number;
    lPadY: number;
    lPadForce: number;
    rPadX: number;
    rPadY: number;
    rPadForce: number;
    l4: boolean;
}

/**
 * 
 * @param x s16, from -32k to +32k
 * @param y s16, from -32k to +32k
 * @param area normalized between 0 and 1
 * @returns [x, y] in window coordinates within area
 */
function transform(x: number, y: number, area: Area): [number, number] {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const maxPos = 2 << 14;
  const relX = (1 + x / maxPos) / 2; // [0, 1]
  const relY = (1 - y / maxPos) / 2; // [0, 1]
  return [
    area.left * width + relX * area.width * width, 
    area.top * height + relY * area.height * height, 
  ];
}

/**
 * Moves/hides/shows cursors depending on input.
 * 
 * @param keyboardState information about current state of the keyboard
 * @param input current input
 * @param lastInput input from last frame/tick
 * @param leftCursor left cursor for left touchpad
 * @param rightCursor right cursor for right touchpad
 */
async function handleTouchpads(
    keyboardState: KeyboardState,
    input: SteamDeckDeviceReport,
    lastInput: SteamDeckDeviceReport,
    leftCursor: HTMLElement,
    rightCursor: HTMLElement) {
  let lPadTouched = input.lPadX != 0 || input.lPadY != 0;
  let rPadTouched = input.rPadX != 0 || input.rPadY != 0;
  let leftCursorX = 0;
  let leftCursorY = 0;
  let rightCursorX = 0;
  let rightCursorY = 0;
  if (lPadTouched) {
    leftCursor.classList.remove('hidden');
    [leftCursorX, leftCursorY] = transform(input.lPadX, input.lPadY, config.cursor.area.left);
    leftCursor.style.top = (leftCursorY - cursorSize / 2) + 'px';
    leftCursor.style.left = (leftCursorX - cursorSize / 2) + 'px';
  } else {
    leftCursor?.classList.add('hidden');
  }
  if (rPadTouched) {
    rightCursor.classList.remove('hidden');
    [rightCursorX, rightCursorY] = transform(input.rPadX, input.rPadY, config.cursor.area.right);
    rightCursor.style.top = (rightCursorY - cursorSize / 2) + 'px';
    rightCursor.style.left = (rightCursorX - cursorSize / 2) + 'px';
  } else {
    rightCursor?.classList.add('hidden');
  }
  let leftKeys: KeyboardKey[] = [];
  if (lPadTouched) {
    leftKeys = getKeys(leftCursorX, leftCursorY);
  }
  let rightKeys: KeyboardKey[] = [];
  if (rPadTouched) {
    rightKeys = getKeys(rightCursorX, rightCursorY);
  }
  const now = new Date();
  handleHoveredKeys(keyboardState, leftKeys, rightKeys);
  if (lastInput.lPadForce < config.cursor.forceThreshold
      && input.lPadForce > config.cursor.forceThreshold) {
    keyboardState.keyStateChanges(
      leftKeys, 'down', now);
    keyboardState.pressedLeftKeys = leftKeys;
    leftKeys.forEach(key => key.classList.add('pressed'));
  } else if (lastInput.lPadForce > config.cursor.forceThreshold
      && input.lPadForce < config.cursor.forceThreshold) {
    leftKeys.forEach(key => key.classList.remove('pressed'));
    keyboardState.keyStateChanges(
      keyboardState.pressedLeftKeys, 'up', now);
    keyboardState.pressedLeftKeys = [];
  }
  if (lastInput.rPadForce < config.cursor.forceThreshold
      && input.rPadForce > config.cursor.forceThreshold) {
    keyboardState.keyStateChanges(
      rightKeys, 'down', now);
    keyboardState.pressedRightKeys = rightKeys;
    rightKeys.forEach(key => key.classList.add('pressed'));
  } else if (lastInput.rPadForce > config.cursor.forceThreshold
      && input.rPadForce < config.cursor.forceThreshold) {
    rightKeys.forEach(key => key.classList.remove('pressed'));
    keyboardState.keyStateChanges(
      keyboardState.pressedRightKeys, 'up', now);
    keyboardState.pressedRightKeys = [];
  }
}

window.addEventListener('DOMContentLoaded', () => {
  log('trace', 'DOM Content loaded event');
  const body = document.querySelector('body');
  let keyboardState = new KeyboardState();
  const renderedKeyboardLayout = renderKeyboardLayoutElement(
    keyboardState, keyboardLayout);
  if (renderedKeyboardLayout) {
    body?.appendChild(renderedKeyboardLayout);
  }
  const leftCursor = document.querySelector<HTMLElement>('#leftCursor');
  const rightCursor = document.querySelector<HTMLElement>('#rightCursor');
  if (!leftCursor) {
    throw Error('Left cursor html element missing');
  }
  if (!rightCursor) {
    throw Error('Right cursor html element missing');
  }
  let lastInput: SteamDeckDeviceReport | undefined = undefined;
  listen('input', async (event: { payload: SteamDeckDeviceReport }) => {
    let input = event.payload;
    if (!lastInput) {
      lastInput = input;
      return;
    }
    handleTouchpads(
      keyboardState,
      input,
      lastInput,
      leftCursor,
      rightCursor);
    lastInput = input;
  });
});
