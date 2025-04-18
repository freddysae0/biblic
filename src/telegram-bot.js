import TelegramBot from 'node-telegram-bot-api';
import { GameEngine } from './utils/gameEngine.js';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize bot with your token
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Initialize game engine
const gameEngine = new GameEngine();

// Store active games and message IDs
const activeGames = new Map();

// Initialize the game engine
await gameEngine.initStorage();
await gameEngine.loadStories();

// Command: /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  const welcomeMessage = `
Welcome to Biblical Adventure Game! 🙏

Experience biblical stories through interactive choices and learn valuable lessons from Scripture.

Available commands:
/start - Show this welcome message
/play - Start a new story
/random - Play a random story
/list - Show available stories
/progress - View your progress
/help - Show help information
`;

  const keyboard = {
    reply_markup: {
      keyboard: [
        ['/play', '/random'],
        ['/list', '/progress'],
        ['/help']
      ],
      resize_keyboard: true
    }
  };

  bot.sendMessage(chatId, welcomeMessage, keyboard);
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `
Biblical Adventure Game Help 📖

This is an interactive game that lets you experience biblical stories through your own choices.

Commands:
/play - Start a new story
/random - Play a random story
/list - Show available stories
/progress - View your progress
/help - Show this help message

Tips:
- Read each story carefully
- Make choices that reflect biblical values
- Your choices affect your character traits
- Answer challenge questions to test your knowledge
- Complete all stories to fully experience the game

May your journey be blessed! 🙏
`;

  bot.sendMessage(chatId, helpMessage);
});

// Command: /list
bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id;
  const stories = gameEngine.getAvailableStories();
  
  if (stories.length === 0) {
    bot.sendMessage(chatId, "No stories available. Please check the installation.");
    return;
  }

  let message = "Available Biblical Stories:\n\n";
  stories.forEach((story, index) => {
    message += `${index + 1}. ${story.title}\n${story.description}\n\n`;
  });

  bot.sendMessage(chatId, message);
});

// Command: /play
bot.onText(/\/play/, async (msg) => {
  const chatId = msg.chat.id;
  const stories = gameEngine.getAvailableStories();

  if (stories.length === 0) {
    bot.sendMessage(chatId, "No stories available. Please check the installation.");
    return;
  }

  const keyboard = {
    reply_markup: {
      inline_keyboard: stories.map((story) => [{
        text: story.title,
        callback_data: `play_${story.id}`
      }])
    }
  };

  bot.sendMessage(chatId, "Choose a biblical story to experience:", keyboard);
});

// Command: /random
bot.onText(/\/random/, async (msg) => {
  const chatId = msg.chat.id;
  const stories = gameEngine.getAvailableStories();

  if (stories.length === 0) {
    bot.sendMessage(chatId, "No stories available. Please check the installation.");
    return;
  }

  const randomIndex = Math.floor(Math.random() * stories.length);
  const story = stories[randomIndex];

  await startStory(chatId, story.id);
});

// Command: /progress
bot.onText(/\/progress/, async (msg) => {
  const chatId = msg.chat.id;
  
  await gameEngine.loadProgress();
  const stats = gameEngine.playerStats;
  
  let message = "📊 YOUR PROGRESS\n\n";
  message += "Character Attributes:\n";
  message += `Faith: ${stats.faith || 0}\n`;
  message += `Wisdom: ${stats.wisdom || 0}\n`;
  message += `Obedience: ${stats.obedience || 0}\n`;
  message += `Compassion: ${stats.compassion || 0}\n`;
  message += `Knowledge: ${stats.knowledge || 0}\n`;
  message += `Curiosity: ${stats.curiosity || 0}\n\n`;

  if (stats.completedStories?.length > 0) {
    message += "Completed Stories:\n";
    const stories = gameEngine.getAvailableStories();
    stats.completedStories.forEach((storyId, index) => {
      const story = stories.find(s => s.id === storyId);
      if (story) {
        message += `${index + 1}. ${story.title}\n`;
      }
    });
  } else {
    message += "No stories completed yet.";
  }

  bot.sendMessage(chatId, message);
});

// Handle callback queries (button clicks)
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  console.log('Received callback:', data); // Debug log

  try {
    if (data.startsWith('play_')) {
      const storyId = data.replace('play_', '');
      await startStory(chatId, storyId);
    } else if (data.includes('_continue')) {
      // Handle continue action
      await handleContinue(chatId, messageId);
    } else if (data.startsWith('choice_')) {
      const [_, segmentId, choiceIndex] = data.split('_');
      const index = parseInt(choiceIndex);
      if (!isNaN(index)) {
        await handleChoice(chatId, messageId, index);
      }
    } else if (data.startsWith('challenge_')) {
      const [_, challengeIndex, answerIndex] = data.split('_').map(Number);
      await handleChallengeAnswer(chatId, messageId, challengeIndex, answerIndex);
    }

    // Answer the callback query
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('Error handling callback query:', error);
    await bot.sendMessage(chatId, "Sorry, there was an error processing your choice. Please try again.");
  }
});

// Start a story for a user
async function startStory(chatId, storyId) {
  const story = gameEngine.stories[storyId];
  if (!story) {
    await bot.sendMessage(chatId, "Story not found.");
    return;
  }

  // Initialize game state for this user
  activeGames.set(chatId, {
    currentStory: story,
    currentSegment: null,
    currentMessageId: null,
    stats: {
      faith: 0,
      wisdom: 0,
      obedience: 0,
      compassion: 0,
      knowledge: 0,
      curiosity: 0
    }
  });

  // Start with intro
  const introSegment = story.narrative.find(segment => segment.id === 'intro');
  await displaySegment(chatId, null, introSegment);
}

// Display a story segment
async function displaySegment(chatId, messageId, segment) {
  const gameState = activeGames.get(chatId);
  if (!gameState) return;

  gameState.currentSegment = segment;
  console.log('Displaying segment:', segment.id); // Debug log

  // Prepare message text
  let message = `${segment.text}\n\n`;
  let keyboard;
  
  if (segment.choices && segment.choices.length > 0) {
    // Choice segment
    keyboard = {
      inline_keyboard: segment.choices.map((choice, index) => [{
        text: choice.text,
        callback_data: `choice_${segment.id}_${index}`
      }])
    };
  } else if (segment.next === 'end') {
    // End segment
    message += "\n🎉 Congratulations! You have completed this biblical story!\n";
    await bot.sendMessage(chatId, message);
    await showTeaching(chatId);
    return;
  } else {
    // Continue segment
    keyboard = {
      inline_keyboard: [[{
        text: "Continue...",
        callback_data: `continue_${segment.id}`
      }]]
    };
  }

  try {
    if (messageId) {
      // Update existing message
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboard
      });
      gameState.currentMessageId = messageId;
    } else {
      // Send new message
      const sentMessage = await bot.sendMessage(chatId, message, { reply_markup: keyboard });
      gameState.currentMessageId = sentMessage.message_id;
    }
  } catch (error) {
    console.error('Error displaying segment:', error);
    // If edit fails, send a new message
    const sentMessage = await bot.sendMessage(chatId, message, { reply_markup: keyboard });
    gameState.currentMessageId = sentMessage.message_id;
  }
}

// Handle continue button
async function handleContinue(chatId, messageId) {
  const gameState = activeGames.get(chatId);
  if (!gameState || !gameState.currentSegment) {
    console.log('No game state found'); // Debug log
    return;
  }

  const segment = gameState.currentSegment;
  if (!segment.next) {
    console.log('No next segment defined'); // Debug log
    return;
  }

  const nextSegment = gameState.currentStory.narrative.find(
    s => s.id === segment.next
  );

  if (nextSegment) {
    console.log(`Moving from segment ${segment.id} to ${nextSegment.id}`); // Debug log
    await displaySegment(chatId, messageId, nextSegment);
  } else {
    console.error(`Could not find next segment: ${segment.next}`);
    await bot.sendMessage(chatId, "Sorry, there was an error continuing the story. Please try again.");
  }
}

// Handle user choice
async function handleChoice(chatId, messageId, choiceIndex) {
  const gameState = activeGames.get(chatId);
  if (!gameState || !gameState.currentSegment) return;

  const segment = gameState.currentSegment;
  if (!segment.choices || !segment.choices[choiceIndex]) return;

  const choice = segment.choices[choiceIndex];

  // Apply effects of the choice
  if (choice.effect) {
    let effectMessage = "\nYour choice affects:\n";
    for (const [stat, value] of Object.entries(choice.effect)) {
      gameState.stats[stat] = (gameState.stats[stat] || 0) + value;
      effectMessage += `${stat.toUpperCase()}: ${value > 0 ? '+' : ''}${value}\n`;
    }
    await bot.sendMessage(chatId, effectMessage);
  }

  // Find and display next segment
  const nextSegment = gameState.currentStory.narrative.find(
    s => s.id === choice.next
  );
  if (nextSegment) {
    await displaySegment(chatId, messageId, nextSegment);
  }
}

// Show teaching after story completion
async function showTeaching(chatId) {
  const gameState = activeGames.get(chatId);
  if (!gameState || !gameState.currentStory) return;

  const { teaching } = gameState.currentStory;
  
  let message = "📖 TEACHING & LESSONS\n\n";
  message += `Main Lesson:\n${teaching.mainLesson}\n\n`;

  if (teaching.secondaryLessons?.length > 0) {
    message += "Other Lessons:\n";
    teaching.secondaryLessons.forEach((lesson, index) => {
      message += `${index + 1}. ${lesson}\n`;
    });
    message += "\n";
  }

  if (teaching.bibleVerses?.length > 0) {
    message += "Bible Verses:\n";
    teaching.bibleVerses.forEach((verse) => {
      message += `${verse.reference} - ${verse.text}\n`;
    });
  }

  await bot.sendMessage(chatId, message);
  await startChallenges(chatId);
}

// Start challenge questions
async function startChallenges(chatId) {
  const gameState = activeGames.get(chatId);
  if (!gameState || !gameState.currentStory?.challenges) return;

  gameState.currentChallenge = 0;
  gameState.correctAnswers = 0;

  await showNextChallenge(chatId);
}

// Show next challenge question
async function showNextChallenge(chatId) {
  const gameState = activeGames.get(chatId);
  if (!gameState || !gameState.currentStory?.challenges) return;

  const challenges = gameState.currentStory.challenges;
  const currentChallenge = gameState.currentChallenge || 0;
  
  if (currentChallenge >= challenges.length) {
    // All challenges completed
    const message = `
Challenge Complete! 🎉
You got ${gameState.correctAnswers} out of ${challenges.length} questions correct!

Knowledge gained: +${Math.floor((gameState.correctAnswers / challenges.length) * 10)}
`;
    await bot.sendMessage(chatId, message);
    activeGames.delete(chatId); // Clear game state
    return;
  }

  const challenge = challenges[currentChallenge];
  const keyboard = {
    reply_markup: {
      inline_keyboard: challenge.options.map((option, index) => [{
        text: option,
        callback_data: `challenge_${currentChallenge}_${index}`
      }])
    }
  };

  await bot.sendMessage(chatId, `Question ${currentChallenge + 1}: ${challenge.question}`, keyboard);
}

// Handle challenge answers
async function handleChallengeAnswer(chatId, messageId, challengeIndex, answerIndex) {
  const gameState = activeGames.get(chatId);
  if (!gameState || !gameState.currentStory?.challenges) return;

  const challenge = gameState.currentStory.challenges[challengeIndex];
  if (!challenge) return;

  if (answerIndex === challenge.correctAnswer) {
    gameState.correctAnswers = (gameState.correctAnswers || 0) + 1;
    await bot.sendMessage(chatId, "✅ Correct!");
  } else {
    await bot.sendMessage(chatId, `❌ Incorrect. The correct answer was: ${challenge.options[challenge.correctAnswer]}`);
  }

  // Move to next challenge
  gameState.currentChallenge = challengeIndex + 1;
  await showNextChallenge(chatId);
}

console.log('Biblical Adventure Bot is running...');
