"use client"

import { useParams } from "react-router-dom"
import ProjectDetailView from "~/components/project/ProjectDetail"

export default function ProjectDetailPage() {
  const { id } = useParams()
  console.log("projectId from URL:", id)
  return <ProjectDetailView projectId={id} />
}
