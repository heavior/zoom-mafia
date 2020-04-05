// This is a generic rooms logic
/*
  * Hosts creates a room (start with in memory, later - in cache, then finally in the db), enters his name and zoom link
  * Host gets a link (room id) to share with other people
  * People can enter their name and join the room if they have the link
  * People automatically rejoin the room after broken connection or page reload (use name as authenticator for now, generate some key later)
  * Room host:
      One person creates the room and owns it
      If he looses connection - another member becomes the host
      Hosts is needed to kick people who lost connection if the can't reconnect and continue the game
  * If the game is on - they are guests, the game itself doesn' know anything about them
  * Host starts a game
  * Game happens
  *

Note: ideally the game doesn't depend on every player connectivitiy, so game master has control over it.
Reason: maybe we shouldn't force players to be in the UI all the time - let them focus on video while master enters their votes

TODO: later - generate some authenticator for people to rejoin as the same people
IDEA: Maybe rooms has chats and game-driven subrooms (mafia chat, etc)
IDEA: Maybe be people can leave the room, this makes them dead in the game, but we don't want to make it too apparent
IDEA: Later - maybe there is a time coordination for the room later
*/


exports.Room = Room;

class Room {
  constructor(){
  }
}
