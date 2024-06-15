import * as vscode from 'vscode';
import * as state from '../state';
import * as utilities from '../utilities';
import * as replSession from './repl-session';
import * as fiddleFiles from '../fiddle-files';
import * as dramRepl from './dram-repl';

// Connected menu items
const RE_JACK_IN_OPTION = 'Restart the Project REPL (a.k.a. Re-jack-in)';
const RE_JACK_IN_COMMAND = 'calva.jackIn';
const JACK_OUT_OPTION = 'Stop/Kill the Project REPL started by Calva (a.k.a. Jack-out)';
const JACK_OUT_COMMAND = 'calva.jackOut';
const INTERRUPT_OPTION = 'Interrupt running Evaluations';
const INTERRUPT_COMMAND = 'calva.interruptAllEvaluations';
const DISCONNECT_OPTION = 'Disconnect from the REPL';
const DISCONNECT_COMMAND = 'calva.disconnect';
const OPEN_WINDOW_OPTION = 'Open the Output Window';
const OPEN_WINDOW_COMMAND = 'calva.showOutputWindow';
const OPEN_FIDDLE_OPTION = 'Open Fiddle for Current File';
const OPEN_FIDDLE_COMMAND = 'calva.openFiddleForSourceFile';
const EVALUATE_FIDDLE_OPTION = 'Evaluate Fiddle for Current File';
const EVALUATE_FIDDLE_COMMAND = 'calva.evaluateFiddleForSourceFile';
const OPEN_SOURCE_FOR_FIDDLE_OPTION = 'Open Source File for Current Fiddle';
const OPEN_SOURCE_FOR_FIDDLE_COMMAND = 'calva.openSourceFileForFiddle';

// Disconnected menu items
export const JACK_IN_OPTION = 'Start your project with a REPL and connect (a.k.a. Jack-in)';
const JACK_IN_COMMAND = 'calva.jackIn';
export const START_REPL_OPTION = 'Start a standalone REPL';
const START_REPL_COMMAND = 'calva.startStandaloneRepl';
const START_JOYRIDE_REPL_OPTION = 'Start a Joyride REPL and Connect';
const START_JOYRIDE_REPL_COMMAND = 'calva.startJoyrideReplAndConnect';
export const START_HELLO_REPL_OPTION = 'Fire up the ”Getting Started” REPL';
const START_HELLO_REPL_COMMAND = 'calva.startStandaloneHelloRepl';
const START_HELLO_CLJS_BROWSER_OPTION = 'Fire up the ”ClojureScript Quick Start” Browser REPL';
export const START_HELLO_CLJS_BROWSER_COMMAND = 'calva.startStandaloneCljsBrowserRepl';
const START_HELLO_CLJS_NODE_OPTION = 'Fire up the ”ClojureScript Quick Start” Node REPL';
export const START_HELLO_CLJS_NODE_COMMAND = 'calva.startStandaloneCljsNodeRepl';
const CONNECT_PROJECT_OPTION = 'Connect to a running REPL in your project';
const CONNECT_PROJECT_COMMAND = 'calva.connect';
const CONNECT_STANDALONE_OPTION = 'Connect to a running REPL, not in your project';
const CONNECT_STANDALONE_COMMAND = 'calva.connectNonProjectREPL';

export function menuSlugForProjectRoot(): MenuSlug {
  const prefix = state.getProjectRootUri() ? state.getProjectRootUri().toString() : 'no-folder';
  const suffix = shouldShowConnectedMenu()
    ? 'connect-repl-menu-connected'
    : 'connect-repl-menu-not-connected';
  return { prefix, suffix };
}

function composeConnectedMenu() {
  const PREFERRED_ORDER = [
    INTERRUPT_OPTION,
    OPEN_WINDOW_OPTION,
    RE_JACK_IN_OPTION,
    DISCONNECT_OPTION,
    JACK_OUT_OPTION,
    OPEN_FIDDLE_OPTION,
    EVALUATE_FIDDLE_OPTION,
    OPEN_SOURCE_FOR_FIDDLE_OPTION,
  ];

  const commands = {};
  if (fiddleFiles.activeEditorIsFiddle) {
    commands[OPEN_SOURCE_FOR_FIDDLE_OPTION] = OPEN_SOURCE_FOR_FIDDLE_COMMAND;
  } else {
    commands[OPEN_FIDDLE_OPTION] = OPEN_FIDDLE_COMMAND;
  }
  commands[INTERRUPT_OPTION] = INTERRUPT_COMMAND;
  commands[DISCONNECT_OPTION] = DISCONNECT_COMMAND;
  if (replSession.getSession('clj')) {
    commands[OPEN_WINDOW_OPTION] = OPEN_WINDOW_COMMAND;
  }
  if (utilities.getJackedInState()) {
    commands[RE_JACK_IN_OPTION] = RE_JACK_IN_COMMAND;
    commands[JACK_OUT_OPTION] = JACK_OUT_COMMAND;
  }
  if (!fiddleFiles.activeEditorIsFiddle) {
    commands[EVALUATE_FIDDLE_OPTION] = EVALUATE_FIDDLE_COMMAND;
  }
  return { commands, PREFERRED_ORDER };
}

function composeDisconnectedMenu() {
  const PREFERRED_ORDER = [
    JACK_IN_OPTION,
    CONNECT_PROJECT_OPTION,
    START_REPL_OPTION,
    START_JOYRIDE_REPL_OPTION,
    CONNECT_STANDALONE_OPTION,
    START_HELLO_REPL_OPTION,
    START_HELLO_CLJS_BROWSER_OPTION,
    START_HELLO_CLJS_NODE_OPTION,
  ];

  const commands = {};
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    if (vscode.workspace.workspaceFolders[0].uri.scheme != 'vsls') {
      commands[JACK_IN_OPTION] = JACK_IN_COMMAND;
      commands[CONNECT_STANDALONE_OPTION] = CONNECT_STANDALONE_COMMAND;
    }
    commands[CONNECT_PROJECT_OPTION] = CONNECT_PROJECT_COMMAND;
  } else {
    commands[CONNECT_STANDALONE_OPTION] = CONNECT_STANDALONE_COMMAND;
    commands[START_REPL_OPTION] = START_REPL_COMMAND;
  }
  commands[START_JOYRIDE_REPL_OPTION] = START_JOYRIDE_REPL_COMMAND;
  commands[START_HELLO_REPL_OPTION] = START_HELLO_REPL_COMMAND;
  commands[START_HELLO_CLJS_BROWSER_OPTION] = START_HELLO_CLJS_BROWSER_COMMAND;
  commands[START_HELLO_CLJS_NODE_OPTION] = START_HELLO_CLJS_NODE_COMMAND;
  return { commands, PREFERRED_ORDER };
}

type MenuSlug = { prefix: string; suffix: string };

function shouldShowConnectedMenu() {
  return (
    utilities.getConnectedState() || utilities.getConnectingState() || utilities.getLaunchingState()
  );
}

export async function startOrConnectRepl() {
  const { commands, PREFERRED_ORDER } = shouldShowConnectedMenu()
    ? composeConnectedMenu()
    : composeDisconnectedMenu();

  const { prefix, suffix } = menuSlugForProjectRoot();
  const sortedCommands = utilities.sortByPresetOrder(Object.keys(commands), PREFERRED_ORDER);
  const command_key = await utilities.quickPickSingle({
    values: sortedCommands.map((a) => ({ label: a })),
    saveAs: `${prefix}/${suffix}`,
    placeHolder: 'Start or Connect a REPL',
  });
  if (command_key) {
    await vscode.commands.executeCommand(commands[command_key]);
  }
}
