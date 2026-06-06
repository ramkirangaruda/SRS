// Teacher meeting room (/dashboard/teacher/meeting-room). Same chat, no group
// creation/management (the shell hides those for non-principals).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MeetingRoom } from "@/components/meeting-room/meeting-room";

export default async function TeacherMeetingRoomPage() {
  const session = await getServerSession(authOptions);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Meeting Room</h1>
        <p className="text-muted-foreground">Staff group chat.</p>
      </div>
      <MeetingRoom currentUserId={session!.user.id} role={session!.user.role} />
    </div>
  );
}
