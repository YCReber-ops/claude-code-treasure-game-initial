import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import closedChest from './assets/treasure_closed.png';
import treasureChest from './assets/treasure_opened.png';
import skeletonChest from './assets/treasure_opened_skeleton.png';
import keyCursor from './assets/key.png';
import AuthScreen from './components/AuthScreen';
import Leaderboard from './components/Leaderboard';
import { logOut, restoreSession, saveScore, type Session, type Stats, type User } from './lib/api';
import chestOpenSound from './audios/chest_open.mp3';
import evilLaughSound from './audios/chest_open_with_evil_laugh.mp3';

interface Box {
  id: number;
  isOpen: boolean;
  hasTreasure: boolean;
}

// Maps the final score to a result label and style. Input: score (number). Output: { label, style } where label is "Win" | "Tie" | "Loss" and style is Tailwind classes.
const getResult = (score: number) => {
  if (score > 0) return { label: 'Win', style: 'bg-green-100 text-green-700 border-green-400' };
  if (score < 0) return { label: 'Loss', style: 'bg-red-100 text-red-700 border-red-400' };
  return { label: 'Tie', style: 'bg-gray-100 text-gray-700 border-gray-400' };
};

export default function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [mode, setMode] = useState<'loading' | 'auth' | 'play'>('loading');

  // Restore a previous session on mount; otherwise show the sign-in screen
  useEffect(() => {
    restoreSession().then(session => {
      if (session) {
        setUser(session.user);
        setStats(session.stats);
        setMode('play');
      } else {
        setMode('auth');
      }
    });
  }, []);

  // Store the final score for signed-in users only; guests never hit the API
  useEffect(() => {
    if (gameEnded && user) {
      saveScore(score)
        .then(newStats => {
          setStats(newStats);
          setLeaderboardKey(k => k + 1);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameEnded]);

  // Applies a successful sign-in/sign-up. Input: session (user + stats). Output: none (updates state and starts a fresh game).
  const handleSignedIn = (session: Session) => {
    setUser(session.user);
    setStats(session.stats);
    setMode('play');
    initializeGame();
  };

  // Signs out and returns to the auth screen. Input: none. Output: none.
  const handleLogout = async () => {
    await logOut();
    setUser(null);
    setStats(null);
    setMode('auth');
  };

  const initializeGame = () => {
    // Randomly assign treasure to one box
    const treasureBoxIndex = Math.floor(Math.random() * 3);
    const newBoxes: Box[] = Array.from({ length: 3 }, (_, index) => ({
      id: index,
      isOpen: false,
      hasTreasure: index === treasureBoxIndex,
    }));
    
    setBoxes(newBoxes);
    setScore(0);
    setGameEnded(false);
  };

  // Initialize game automatically when component mounts
  useEffect(() => {
    initializeGame();
  }, []);

  // Plays the chest opening sound (evil laugh version for skeleton). Input: hasTreasure (boolean, whether the chest holds treasure). Output: none (side effect: audio playback).
  const playChestOpenSound = (hasTreasure: boolean) => {
    const audio = new Audio(hasTreasure ? chestOpenSound : evilLaughSound);
    audio.play().catch(() => {});
  };

  const openBox = (boxId: number) => {
    if (gameEnded) return;

    // Play sound only when a closed chest is actually being opened
    const targetBox = boxes.find(box => box.id === boxId && !box.isOpen);
    if (targetBox) {
      playChestOpenSound(targetBox.hasTreasure);
    }

    setBoxes(prevBoxes => {
      const updatedBoxes = prevBoxes.map(box => {
        if (box.id === boxId && !box.isOpen) {
          const newScore = box.hasTreasure ? score + 100 : score - 50;
          setScore(newScore);
          return { ...box, isOpen: true };
        }
        return box;
      });
      
      // Check if treasure is found or all boxes are opened
      const treasureFound = updatedBoxes.some(box => box.isOpen && box.hasTreasure);
      const allOpened = updatedBoxes.every(box => box.isOpen);
      if (treasureFound || allOpened) {
        setGameEnded(true);
      }
      
      return updatedBoxes;
    });
  };

  const resetGame = () => {
    initializeGame();
  };

  if (mode === 'loading') return null;
  if (mode === 'auth') {
    return <AuthScreen onSignedIn={handleSignedIn} onGuest={() => { setMode('play'); initializeGame(); }} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      <div className="absolute top-4 right-4 flex items-center gap-3 text-sm text-amber-900">
        {user ? (
          <>
            <span>
              👤 <strong>{user.name || user.email}</strong>
              {stats && ` | Games: ${stats.gamesPlayed} | Best: ${stats.bestScore ?? '-'} | Total: ${stats.totalScore}`}
            </span>
            <Button size="sm" variant="outline" onClick={handleLogout}>Sign Out</Button>
          </>
        ) : (
          <>
            <span>Guest mode (scores are not saved)</span>
            <Button size="sm" variant="outline" onClick={() => setMode('auth')}>Sign In</Button>
          </>
        )}
      </div>
      <div className="mb-6 lg:mb-0 lg:absolute lg:left-4 lg:top-16">
        <Leaderboard refreshKey={leaderboardKey} currentUserId={user?.id} />
      </div>
      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-800 mb-4">
          Click on the treasure chests to discover what's inside!
        </p>
        <p className="text-amber-700 text-sm">
          💰 Treasure: +$100 | 💀 Skeleton: -$50
        </p>
      </div>

      <div className="mb-8 flex items-center justify-center gap-4">
        <div className="text-2xl text-center p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400">
          <span className="text-amber-900">{user ? `${user.name || user.email}'s Current Score: ` : 'Current Score: '}</span>
          <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${score}
          </span>
        </div>

        {gameEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`text-2xl font-bold px-4 py-2 rounded-lg border-2 ${getResult(score).style}`}
          >
            {getResult(score).label}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {boxes.map((box) => (
              <motion.div
                key={box.id}
                className="flex flex-col items-center cursor-pointer"
                style={box.isOpen ? undefined : { cursor: `url(${keyCursor}) 0 0, pointer` }}
                whileHover={{ scale: box.isOpen ? 1 : 1.05 }}
                whileTap={{ scale: box.isOpen ? 1 : 0.95 }}
                onClick={() => openBox(box.id)}
              >
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ 
                    rotateY: box.isOpen ? 180 : 0,
                    scale: box.isOpen ? 1.1 : 1
                  }}
                  transition={{ 
                    duration: 0.6,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <img
                    src={box.isOpen 
                      ? (box.hasTreasure ? treasureChest : skeletonChest)
                      : closedChest
                    }
                    alt={box.isOpen 
                      ? (box.hasTreasure ? "Treasure!" : "Skeleton!")
                      : "Treasure Chest"
                    }
                    className="w-48 h-48 object-contain drop-shadow-lg"
                  />
                  
                  {box.isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                    >
                      {box.hasTreasure ? (
                        <div className="text-2xl animate-bounce">✨💰✨</div>
                      ) : (
                        <div className="text-2xl animate-pulse">💀👻💀</div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
                
                <div className="mt-4 text-center">
                  {box.isOpen ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                      className={`text-lg p-2 rounded-lg ${
                        box.hasTreasure 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {box.hasTreasure ? '+$100' : '-$50'}
                    </motion.div>
                  ) : (
                    <div className="text-amber-700 p-2">
                      Click to open!
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
      </div>

      {gameEnded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-4 p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
                <h2 className="text-2xl mb-2 text-amber-900">Game Over!</h2>
                <p className="text-lg text-amber-800">
                  {user ? `${user.name || user.email}'s Final Score: ` : 'Final Score: '}<span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${score}
                  </span>
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  {boxes.some(box => box.isOpen && box.hasTreasure) 
                    ? 'Treasure found! Well done, treasure hunter! 🎉' 
                    : 'No treasure found this time! Better luck next time! 💀'}
                </p>
              </div>
              
              <Button 
                onClick={resetGame}
                className="text-lg px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Play Again
              </Button>
            </motion.div>
          )}
    </div>
  );
}
