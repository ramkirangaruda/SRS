import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVideo } from "@/lib/videos";
import { VideoDetail } from "@/components/videos/video-detail";

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const video = await getVideo(params.id, session!.user.schoolId, true);
  if (!video) notFound();
  return <VideoDetail video={video} basePath="/parent/videos" deletable={false} />;
}
