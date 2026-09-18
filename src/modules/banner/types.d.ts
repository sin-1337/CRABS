/**
 * Metrics and UI payload for the room banner.
 */
interface BannerStats {
  roomName: string;
  adminInRoom: number;
  totalAdmins: number;
  playersInRoom: number;
  totalPlayers: number;
  friendsOnline: number;
  totalFriends: number;
  onlinePlayers: string;
  isMap: boolean;
  keyState: string;
  keyHtml: string;
}
