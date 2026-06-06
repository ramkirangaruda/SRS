// Principal meeting room (/principal/meeting-room).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MeetingRoom } from "@/components/meeting-room/meeting-room";

export default async function PrincipalMeetingRoomPage() {
  const session = await getServerSession(authOptions);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Meeting Room</h1>
        <p className="text-muted-foreground">Internal staff group chat.</p>
      </div>
      <MeetingRoom currentUserId={session!.user.id} role={session!.user.role} />
    </div>
  );
}
