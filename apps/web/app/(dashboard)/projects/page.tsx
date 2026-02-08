"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderOpen, RefreshCw, Home, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { useProjects } from "@/hooks/use-projects";
import Link from "next/link";

export default function ProjectsPage() {
  const { projects, loading, refresh } = useProjects();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      // Priority 1: Active status (active or running)
      const isActive = (status: string) =>
        ["active", "running"].includes(status?.toLowerCase());

      const aActive = isActive(a.status);
      const bActive = isActive(b.status);

      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      // Priority 2: Creation date (newest first)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      // Handle invalid dates safely
      const validDateA = isNaN(dateA) ? 0 : dateA;
      const validDateB = isNaN(dateB) ? 0 : dateB;

      return validDateB - validDateA;
    });
  }, [projects]);

  const handleCreateProject = () => {
    setCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        <span className="text-foreground font-medium">Projects</span>
      </nav>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">
            Your <span className="gradient-text">Projects</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">
            Manage your research projects and track ongoing investigations
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex-1 sm:flex-none"
          >
            <Button
              size="default"
              className="gap-2 shadow-glow-sm hover:shadow-glow-md transition-all duration-300 w-full sm:w-auto sm:size-lg"
              onClick={() => handleCreateProject()}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>New Project</span>
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 transition-all duration-300"
              onClick={() => refresh()}
              title="Refresh projects"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="sr-only">Refresh projects</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-xl bg-muted/30 animate-pulse border border-teal-500/10"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="col-span-full text-center py-20 border-2 border-dashed border-teal-500/20 rounded-xl glass-card"
        >
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-teal-400/60" />
          <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground/80 mb-6">
            Create your first project to start tracking research topics
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={() => handleCreateProject()}
              className="gap-2 shadow-glow-sm hover:shadow-glow-md transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Projects Grid */}
      {!loading && projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          <AnimatePresence mode="popLayout">
            {sortedProjects.map((project, index) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                <ProjectCard project={project} onProjectDeleted={refresh} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onProjectCreated={refresh}
      />
    </div>
  );
}
