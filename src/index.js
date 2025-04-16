#!/usr/bin/env node

import { Command } from "commander";
import figlet from "figlet";
import chalk from "chalk";
import inquirer from "inquirer";
import * as path from "path";
import { fileURLToPath } from "url";
import { GameEngine } from "./utils/gameEngine.js";

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a new game engine instance
const gameEngine = new GameEngine();

// Create a new program
const program = new Command();

/**
 * Display welcome screen
 */
function displayWelcomeScreen() {
  console.clear();
  console.log(
    chalk.yellow(figlet.textSync("Biblic Game", { horizontalLayout: "full" }))
  );
  console.log(chalk.cyan("\nAn Interactive Biblical Text Adventure\n"));
  console.log(
    chalk.dim(
      "Experience biblical stories through interactive choices and challenges."
    )
  );
  console.log(
    chalk.dim("Learn moral lessons and test your knowledge of the Bible.\n")
  );
}

/**
 * Display main menu and handle user selection
 */
async function showMainMenu() {
  displayWelcomeScreen();

  // Load stories
  await gameEngine.initStorage();
  await gameEngine.loadStories();

  // Load user progress
  await gameEngine.loadProgress();

  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "What would you like to do?",
      choices: [
        { name: "📖 Start a New Story", value: "start" },
        { name: "🎲 Play a Random Story", value: "random" },
        { name: "📋 List All Stories", value: "list" },
        { name: "📊 View Your Progress", value: "progress" },
        { name: "🔄 Reset Progress", value: "reset" },
        { name: "❓ Help", value: "help" },
        { name: "👋 Exit", value: "exit" },
      ],
    },
  ]);

  switch (choice) {
    case "start":
      await startStory();
      break;
    case "random":
      await startRandomStory();
      break;
    case "list":
      await listStories();
      break;
    case "progress":
      await showProgress();
      break;
    case "reset":
      await resetProgress();
      break;
    case "help":
      showHelp();
      break;
    case "exit":
      console.log(
        chalk.green("\nThank you for playing Biblic Game! Goodbye.\n")
      );
      process.exit(0);
      break;
  }

  // Return to main menu after command completes (except exit)
  if (choice !== "exit") {
    const { returnToMenu } = await inquirer.prompt([
      {
        type: "input",
        name: "returnToMenu",
        message: chalk.dim("Press ENTER to return to the main menu..."),
      },
    ]);

    await showMainMenu();
  }
}

/**
 * Start a specific story selected by the user
 */
async function startStory() {
  const stories = gameEngine.getAvailableStories();

  if (stories.length === 0) {
    console.log(
      chalk.red("No stories available. Please check your installation.")
    );
    return;
  }

  const storyChoices = stories.map((story) => ({
    name: `${story.title} - ${story.description}`,
    value: story.id,
  }));

  const { storyId } = await inquirer.prompt([
    {
      type: "list",
      name: "storyId",
      message: "Choose a biblical story to experience:",
      choices: storyChoices,
    },
  ]);

  await gameEngine.startStory(storyId);
}

/**
 * Start a random story
 */
async function startRandomStory() {
  const stories = gameEngine.getAvailableStories();

  if (stories.length === 0) {
    console.log(
      chalk.red("No stories available. Please check your installation.")
    );
    return;
  }

  const randomIndex = Math.floor(Math.random() * stories.length);
  const randomStory = stories[randomIndex];

  console.log(chalk.green(`\nRandomly selected: ${randomStory.title}\n`));

  await gameEngine.startStory(randomStory.id);
}

/**
 * List all available stories
 */
async function listStories() {
  const stories = gameEngine.getAvailableStories();

  console.log(chalk.blue("\nAvailable Biblical Stories:\n"));

  if (stories.length === 0) {
    console.log(
      chalk.red("No stories available. Please check your installation.")
    );
    return;
  }

  // Load user progress to mark completed stories
  const hasProgress = await gameEngine.loadProgress();
  const completedStories = hasProgress
    ? gameEngine.playerStats.completedStories
    : [];

  stories.forEach((story, index) => {
    const isCompleted = completedStories.includes(story.id);
    const statusSymbol = isCompleted ? chalk.green("✓ ") : chalk.gray("○ ");

    console.log(
      `${statusSymbol}${chalk.white(index + 1)}. ${chalk.bold(story.title)}`
    );
    console.log(`   ${chalk.dim(story.description)}`);
    console.log("");
  });

  console.log(
    chalk.dim("Legend: ") +
      chalk.green("✓ ") +
      chalk.dim("Completed") +
      chalk.gray(" ○ ") +
      chalk.dim("Not Yet Completed")
  );
}

/**
 * Show user progress
 */
async function showProgress() {
  // Display progress will handle all the visualization
  await gameEngine.displayProgress();
}

/**
 * Reset user progress
 */
async function resetProgress() {
  const { confirmReset } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmReset",
      message:
        "Are you sure you want to reset your progress? This cannot be undone.",
      default: false,
    },
  ]);

  if (confirmReset) {
    const success = await gameEngine.resetProgress();
    if (success) {
      console.log(chalk.green("\nYour progress has been reset!"));
    } else {
      console.log(chalk.red("\nFailed to reset progress."));
    }
  } else {
    console.log(chalk.green("\nReset cancelled."));
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(chalk.blue("\nBiblic Game Help:\n"));
  console.log(
    chalk.white(
      "Biblic is an interactive text adventure game based on biblical stories."
    )
  );
  console.log(
    chalk.white(
      "Each story presents you with choices that affect your character traits."
    )
  );
  console.log(
    chalk.white(
      "After completing a story, you will be tested with challenge questions."
    )
  );

  console.log(chalk.yellow("\nCommands:\n"));
  console.log(
    chalk.white(
      "biblic start       - Start the game with a story selection menu"
    )
  );
  console.log(
    chalk.white("biblic list        - List all available biblical stories")
  );
  console.log(
    chalk.white("biblic progress    - View your progress and character traits")
  );
  console.log(
    chalk.white("biblic reset       - Reset all your progress and start fresh")
  );
  console.log(
    chalk.white("biblic help        - Display this help information")
  );

  console.log(chalk.yellow("\nTips:\n"));
  console.log(
    chalk.white(
      "- Read each story carefully and make choices that reflect biblical values"
    )
  );
  console.log(
    chalk.white(
      "- Your choices affect your character traits (faith, wisdom, etc.)"
    )
  );
  console.log(
    chalk.white(
      "- Challenge questions test your understanding of the biblical stories"
    )
  );
  console.log(
    chalk.white("- Complete all stories to fully experience the game")
  );
}

// Program information
program
  .name("biblic")
  .description("An interactive biblical text adventure game")
  .version("1.0.0");

// Define commands
program
  .command("start")
  .description("Start the biblical text adventure game")
  .action(async () => {
    await showMainMenu();
  });

program
  .command("list")
  .description("List all available biblical stories")
  .action(async () => {
    // Load stories first
    await gameEngine.loadStories();
    await listStories();
  });

program
  .command("progress")
  .description("Show your progress in the game")
  .action(async () => {
    // Load stories first
    await gameEngine.loadStories();
    await showProgress();
  });

program
  .command("reset")
  .description("Reset your game progress")
  .action(async () => {
    await resetProgress();
  });

// Add help command explicitly
program
  .command("help")
  .description("Display help information")
  .action(() => {
    showHelp();
  });

// Handle errors
program.showHelpAfterError("(add --help for additional information)");

// Parse command line arguments
program.parse(process.argv);

// If no arguments provided, show the main menu
if (process.argv.length <= 2) {
  // Show welcome screen and main menu
  showMainMenu().catch((error) => {
    console.error(chalk.red("An error occurred:"), error);
    process.exit(1);
  });
}
