import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Plus, GitMerge, Settings, Trash2, Edit2, ChevronRight, ArrowLeft, ArrowRight, GitBranch, RefreshCw, X, Archive, ArchiveRestore, LayoutGrid, ArrowLeftCircle, MoreVertical, Search } from 'lucide-react';
import { Project, Task, GraphNode } from '../types/task';
import * as d3 from 'd3';
import { nanoid } from 'nanoid';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export function ProjectView() {
  const { projects, tasks, addProject, updateProject, deleteProject, addTask, updateTask, deleteTask, openTaskModal, toggleProjectEdge } = useTaskStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>(projects.length > 0 ? 'grid' : 'grid');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#6366f1');
  
  const [activeMenuNodeId, setActiveMenuNodeId] = useState<string | null>(null);
  const activeMenuNodeIdRef = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const prevProjectIdRef = useRef<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  
  const currentProject = projects.find(p => p.id === selectedProjectId);
  const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);

  useEffect(() => {
    activeMenuNodeIdRef.current = activeMenuNodeId;
  }, [activeMenuNodeId]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const newProjectId = addProject({
      name: newProjectName.trim(),
      color: newProjectColor,
      isArchived: false,
    });
    
    // Add a default mainline task
    addTask({
      title: '初始主线站点',
      projectId: newProjectId,
      projectNodeType: 'mainline',
    });
    
    setNewProjectName('');
    setIsCreatingProject(false);
    
    // Select the newly created project
    setSelectedProjectId(newProjectId);
    setViewMode('detail');
  };

  const handleStartEditProject = () => {
    if (!currentProject) return;
    setEditProjectName(currentProject.name);
    setEditProjectColor(currentProject.color);
    setIsEditingProject(true);
  };

  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !editProjectName.trim()) return;
    updateProject(currentProject.id, {
      name: editProjectName.trim(),
      color: editProjectColor,
    });
    setIsEditingProject(false);
  };

  const handleToggleArchiveProject = () => {
    if (!currentProject) return;
    updateProject(currentProject.id, {
      isArchived: !currentProject.isArchived,
    });
  };

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setViewMode('detail');
  };

  const handleAddBefore = (nodeId: string) => {
    const targetTask = tasks.find(t => t.id === nodeId);
    if (!targetTask || !currentProject) return;

    const newTaskId = addTask({
      title: '新前置任务',
      projectId: currentProject.id,
      projectNodeType: targetTask.projectNodeType,
      dependencies: targetTask.dependencies || [],
      parentId: targetTask.parentId,
    });

    updateTask(targetTask.id, { 
      dependencies: [newTaskId],
      parentId: undefined 
    });
    setActiveMenuNodeId(null);
  };

  const handleAddAfter = (nodeId: string) => {
    const targetTask = tasks.find(t => t.id === nodeId);
    if (!targetTask || !currentProject) return;

    const newTaskId = addTask({
      title: '新后置任务',
      projectId: currentProject.id,
      projectNodeType: targetTask.projectNodeType,
      dependencies: [targetTask.id],
      parentId: undefined,
    });

    // Insertion logic: find tasks that depended on targetTask and update them to depend on the new task
    const dependentTasks = tasks.filter(t => t.dependencies?.includes(targetTask.id));
    dependentTasks.forEach(t => {
      const newDeps = (t.dependencies || []).map(d => d === targetTask.id ? newTaskId : d);
      updateTask(t.id, { dependencies: newDeps });
    });
    
    setActiveMenuNodeId(null);
  };

  const handleAddBranch = (nodeId: string) => {
    const targetTask = tasks.find(t => t.id === nodeId);
    if (!targetTask || !currentProject) return;

    addTask({
      title: '新支线任务',
      projectId: currentProject.id,
      projectNodeType: 'branch',
      parentId: targetTask.id,
    });
    
    setActiveMenuNodeId(null);
  };

  const [isDeleteNodeModalOpen, setIsDeleteNodeModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [nodeToReplace, setNodeToReplace] = useState<string | null>(null);
  
  const [showArchived, setShowArchived] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectColor, setEditProjectColor] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    
    // Only allow reordering when not searching
    if (searchQuery.trim()) return;

    let sourceIndex = result.source.index;
    let destIndex = result.destination.index;

    if (isCreatingProject) {
      if (sourceIndex === 0 || destIndex === 0) return; // Cannot drag the create form or drop before it
      sourceIndex -= 1;
      destIndex -= 1;
    }

    useTaskStore.getState().reorderProjects(sourceIndex, destIndex, showArchived);
  };

  const handleOpenReplaceModal = (nodeId: string) => {
    setNodeToReplace(nodeId);
    setIsReplaceModalOpen(true);
  };

  const confirmReplaceNode = (selectedTaskId: string) => {
    if (!nodeToReplace || !currentProject) return;
    const targetTask = tasks.find(t => t.id === nodeToReplace);
    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    if (!targetTask || !selectedTask) return;

    // 1. Update selectedTask with targetTask's project metadata
    updateTask(selectedTaskId, {
      projectId: currentProject.id,
      projectNodeType: targetTask.projectNodeType,
      parentId: targetTask.parentId,
      dependencies: targetTask.dependencies || [],
    });

    // 2. Update all tasks that depended on targetTask to now depend on selectedTask
    const dependentTasks = tasks.filter(t => t.dependencies?.includes(targetTask.id));
    dependentTasks.forEach(t => {
      const newDeps = (t.dependencies || []).map(d => d === targetTask.id ? selectedTask.id : d);
      updateTask(t.id, { dependencies: newDeps });
    });

    // 3. Update all tasks that had targetTask as parentId to now have selectedTask as parentId
    const childTasks = tasks.filter(t => t.parentId === targetTask.id);
    childTasks.forEach(t => {
      updateTask(t.id, { parentId: selectedTask.id });
    });

    // 4. Remove targetTask from the project
    updateTask(targetTask.id, {
      projectId: undefined,
      projectNodeType: undefined,
      parentId: undefined,
      dependencies: [],
      postDependencies: [],
    });

    // 5. Bring over all descendant subtasks of the selectedTask into the project as branch tasks
    const bringOverSubtasks = (parentId: string) => {
      const subtasks = tasks.filter(t => t.parentId === parentId);
      subtasks.forEach(t => {
        updateTask(t.id, {
          projectId: currentProject.id,
          projectNodeType: 'branch',
        });
        bringOverSubtasks(t.id);
      });
    };
    bringOverSubtasks(selectedTask.id);

    setIsReplaceModalOpen(false);
    setNodeToReplace(null);
    setActiveMenuNodeId(null);
  };

  const handleDeleteProject = () => {
    setIsDeleteProjectModalOpen(true);
  };

  const confirmDeleteProject = () => {
    if (!currentProject) return;
    deleteProject(currentProject.id);
    setIsDeleteProjectModalOpen(false);
    // Select another project if available
    const remainingProjects = projects.filter(p => p.id !== currentProject.id);
    setSelectedProjectId(remainingProjects.length > 0 ? remainingProjects[0].id : null);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodeToDelete(nodeId);
    setIsDeleteNodeModalOpen(true);
  };

  const confirmDeleteNode = () => {
    if (!nodeToDelete) return;
    const targetTask = tasks.find(t => t.id === nodeToDelete);
    if (!targetTask) return;

    const dependentTasks = tasks.filter(t => t.dependencies?.includes(targetTask.id));
    
    // If this was a branch entry node (has parentId), 
    // the first dependent task should inherit the parentId to maintain the branch connection
    if (targetTask.projectNodeType === 'branch' && targetTask.parentId) {
      if (dependentTasks.length > 0) {
        updateTask(dependentTasks[0].id, { parentId: targetTask.parentId });
      }
    }

    dependentTasks.forEach(t => {
      const newDeps = (t.dependencies || []).filter(d => d !== targetTask.id);
      const combinedDeps = Array.from(new Set([...newDeps, ...(targetTask.dependencies || [])]));
      updateTask(t.id, { dependencies: combinedDeps });
    });

    const childTasks = tasks.filter(t => t.parentId === targetTask.id);
    childTasks.forEach(t => {
      updateTask(t.id, { parentId: targetTask.parentId });
    });

    deleteTask(targetTask.id);
    setIsDeleteNodeModalOpen(false);
    setNodeToDelete(null);
    setActiveMenuNodeId(null);
  };

// ... (rest of the file)
  const graphData = useMemo(() => {
    if (!currentProject) return null;

    const nodes: GraphNode[] = [];
    const links: any[] = [];
    
    // 1. Identify mainline tasks
    const mainlineTasks = projectTasks.filter(t => t.projectNodeType === 'mainline');
    
    // Sort mainline tasks topologically based on dependencies
    // For simplicity, we'll just sort them by creation date if no dependencies, 
    // or build a simple chain.
    const mainlineMap = new Map(mainlineTasks.map(t => [t.id, t]));
    const mainlineRoots = mainlineTasks.filter(t => !t.dependencies || t.dependencies.filter(d => mainlineMap.has(d)).length === 0);
    
    const sortedMainline: Task[] = [];
    const visited = new Set<string>();
    
    const visit = (task: Task) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);
      sortedMainline.push(task);
      
      // Find tasks that depend on this one
      const nextTasks = mainlineTasks.filter(t => t.dependencies?.includes(task.id));
      nextTasks.forEach(visit);
    };
    
    mainlineRoots.forEach(visit);
    // Add any disconnected mainline tasks
    mainlineTasks.forEach(t => {
      if (!visited.has(t.id)) visit(t);
    });

    const nodePositions = new Map<string, { x: number, y: number }>();
    
    // Assign coordinates to mainline
    sortedMainline.forEach((task, index) => {
      nodePositions.set(task.id, { x: index * 2, y: 0 }); // Use 2 units for X to allow 0.5 offsets easily
      nodes.push({ ...task, x: index * 2, y: 0, type: 'mainline' });
      
      // Add horizontal links
      if (task.dependencies) {
        task.dependencies.forEach(depId => {
          if (mainlineMap.has(depId)) {
            links.push({ id: `${depId}-${task.id}`, source: depId, target: task.id, type: 'horizontal', isMainline: true });
          }
        });
      }
    });

    // 2. Process branches
    const branchTasks = projectTasks.filter(t => t.projectNodeType === 'branch');
    const branchMap = new Map(branchTasks.map(t => [t.id, t]));
    
    // We need to assign Y offsets to branches to avoid collisions
    // A simple approach: keep track of occupied (x, y) grid cells
    const occupied = new Set<string>();
    sortedMainline.forEach(t => occupied.add(`${nodePositions.get(t.id)!.x},0`));

    const findFreeY = (startX: number, preferredYDir: number) => {
      let y = preferredYDir;
      let step = 1;
      while (occupied.has(`${startX},${y}`)) {
        y = preferredYDir > 0 ? preferredYDir + step : preferredYDir - step;
        if (occupied.has(`${startX},${y}`)) {
          y = preferredYDir > 0 ? preferredYDir - step : preferredYDir + step;
        }
        step++;
      }
      return y;
    };

    // Process branches recursively from parents
    const processBranch = (task: Task, parentX: number, parentY: number, preferredYDir: number) => {
      if (nodePositions.has(task.id)) return;

      let x, y;
      if (task.parentId) {
        // Branch entry: diagonal from parent
        x = parentX + 1;
        y = findFreeY(x, parentY + preferredYDir);
      } else {
        // Sequence node: horizontal from dependency
        x = parentX + 1;
        y = parentY;
        while (occupied.has(`${x},${y}`)) x += 1;
      }
      
      nodePositions.set(task.id, { x, y });
      occupied.add(`${x},${y}`);
      nodes.push({ ...task, x, y, type: 'branch' });

      // Add links
      if (task.parentId) {
        links.push({ id: `${task.parentId}-${task.id}`, source: task.parentId, target: task.id, type: 'diagonal', isMainline: false });
      }
      
      if (task.dependencies) {
        task.dependencies.forEach(depId => {
          if (branchMap.has(depId) || mainlineMap.has(depId)) {
            links.push({ id: `${depId}-${task.id}`, source: depId, target: task.id, type: 'horizontal', isMainline: false });
          }
        });
      }

      // Process sub-branches (children)
      const children = branchTasks.filter(t => t.parentId === task.id);
      children.forEach((child, i) => processBranch(child, x, y, i % 2 === 0 ? 1 : -1));

      // Process sequence (successors)
      const nextInSequence = branchTasks.filter(t => t.dependencies?.includes(task.id));
      nextInSequence.forEach(nextTask => processBranch(nextTask, x, y, preferredYDir));
    };

    // Start processing branches from mainline nodes
    sortedMainline.forEach(mainline => {
      // Branches are tasks that are children of the mainline task, OR
      // tasks that depend on the mainline task but don't have a parent.
      const branches = branchTasks.filter(t => 
        t.parentId === mainline.id || 
        (!t.parentId && t.dependencies?.includes(mainline.id))
      );
      
      const pos = nodePositions.get(mainline.id)!;
      branches.forEach((child, i) => {
        processBranch(child, pos.x, pos.y, i % 2 === 0 ? 1 : -1);
      });
    });
    
    // Process any orphaned branches
    branchTasks.forEach(t => {
      if (!nodePositions.has(t.id)) {
        processBranch(t, 0, findFreeY(0, 1), 1);
      }
    });

    return { nodes, links };
  }, [currentProject, projectTasks]);


  // Render D3 Graph
  useEffect(() => {
    if (!graphData || !svgRef.current || !currentProject) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const UNIT_X = 120;
    const UNIT_Y = 80;
    
    // Calculate bounds to center the graph
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    graphData.nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const graphWidth = (maxX - minX) * UNIT_X;
    const graphHeight = (maxY - minY) * UNIT_Y;
    
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        zoomTransformRef.current = event.transform;
        
        // Update menu position if it's open
        if (activeMenuNodeIdRef.current && menuRef.current) {
          const activeNode = graphData.nodes.find(n => n.id === activeMenuNodeIdRef.current);
          if (activeNode) {
            const screenX = event.transform.applyX(activeNode.x * UNIT_X);
            const screenY = event.transform.applyY(activeNode.y * UNIT_Y);
            menuRef.current.style.left = `${screenX - menuRef.current.offsetWidth / 2}px`;
            menuRef.current.style.top = `${screenY - menuRef.current.offsetHeight - 20}px`;
          }
        }
      });

    svg.call(zoom);
    
    // Initial transform to center
    const initialScale = Math.min(1, Math.min(width / (graphWidth + 200), height / (graphHeight + 200)));
    const initialX = width / 2 - ((maxX + minX) / 2) * UNIT_X * initialScale;
    const initialY = height / 2 - ((maxY + minY) / 2) * UNIT_Y * initialScale;
    
    const initialTransform = d3.zoomIdentity.translate(initialX, initialY).scale(initialScale);
    svg.call(zoom.transform, initialTransform);
    zoomTransformRef.current = initialTransform;

    // Draw links
    const linkGen = d3.line<any>()
      .x(d => d.x * UNIT_X)
      .y(d => d.y * UNIT_Y)
      .curve(d3.curveMonotoneX);

    graphData.links.forEach(link => {
      const source = graphData.nodes.find(n => n.id === link.source);
      const target = graphData.nodes.find(n => n.id === link.target);
      if (!source || !target) return;

      let pathData = "";
      if (link.type === 'horizontal') {
        pathData = linkGen([source, target])!;
      } else if (link.type === 'diagonal') {
        // Draw a nice subway-style diagonal curve
        // Start horizontal, then 45 degree, then horizontal
        const midX = (source.x + target.x) / 2;
        pathData = `M ${source.x * UNIT_X} ${source.y * UNIT_Y} 
                    C ${midX * UNIT_X} ${source.y * UNIT_Y}, 
                      ${midX * UNIT_X} ${target.y * UNIT_Y}, 
                      ${target.x * UNIT_X} ${target.y * UNIT_Y}`;
      }

      const isActive = currentProject.activeEdges?.includes(link.id);

      // Visible line
      g.append("path")
        .attr("d", pathData)
        .attr("fill", "none")
        .attr("stroke", isActive ? "#3b82f6" : (link.isMainline ? currentProject.color : `${currentProject.color}66`))
        .attr("stroke-width", link.isMainline ? 6 : 3)
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", isActive ? "12 8" : "none")
        .attr("class", isActive ? "animate-flow" : "");

      // Invisible hit area for easier clicking
      g.append("path")
        .attr("d", pathData)
        .attr("fill", "none")
        .attr("stroke", "transparent")
        .attr("stroke-width", 20)
        .style("cursor", "pointer")
        .on("click", (event) => {
          event.stopPropagation();
          toggleProjectEdge(currentProject.id, link.id);
        });
    });

    // Draw nodes
    const nodeGroups = g.selectAll<SVGGElement, GraphNode>(".node")
      .data(graphData.nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: GraphNode) => `translate(${d.x * UNIT_X},${d.y * UNIT_Y})`)
      .style("cursor", "pointer")
      .on("click", (event, d: GraphNode) => {
        event.stopPropagation();
        
        if (activeMenuNodeIdRef.current === d.id) {
          // If clicking the same node, close menu and open task details
          setActiveMenuNodeId(null);
          openTaskModal(d.id);
        } else {
          // Otherwise, open the menu
          setActiveMenuNodeId(d.id);
          
          // Position the menu
          if (menuRef.current && svgRef.current) {
            const svgRect = svgRef.current.getBoundingClientRect();
            const transform = zoomTransformRef.current;
            
            // Calculate screen coordinates
            const screenX = transform.applyX(d.x * UNIT_X);
            const screenY = transform.applyY(d.y * UNIT_Y);
            
            // Position menu above the node
            menuRef.current.style.left = `${screenX - menuRef.current.offsetWidth / 2}px`;
            menuRef.current.style.top = `${screenY - menuRef.current.offsetHeight - 20}px`;
          }
        }
      });

    // Node circles (Stations)
    nodeGroups.append("circle")
      .attr("r", (d: GraphNode) => d.type === 'mainline' ? 12 : 8)
      .attr("fill", (d: GraphNode) => d.state === 'done' ? currentProject.color : "#fff")
      .attr("stroke", currentProject.color)
      .attr("stroke-width", (d: GraphNode) => d.type === 'mainline' ? 4 : 2)
      .attr("stroke-dasharray", (d: GraphNode) => 
        (d.state === 'in_progress' || d.state === 'in_review') ? (d.type === 'mainline' ? "5,4" : "4,3") : "none"
      );

    // Inner elements based on state
    nodeGroups.each(function(d: GraphNode) {
      const group = d3.select(this);
      const isMainline = d.type === 'mainline';
      
      if (d.state === 'in_progress' || d.state === 'in_review') {
        // Small inner dot
        group.append("circle")
          .attr("r", isMainline ? 4 : 3)
          .attr("fill", currentProject.color);
      } else if (d.state === 'snoozed') {
        // Pause symbol (||)
        const lineLength = isMainline ? 8 : 6;
        const gap = isMainline ? 2.5 : 2;
        const strokeWidth = isMainline ? 2.5 : 2;
        
        // Left line
        group.append("line")
          .attr("x1", -gap)
          .attr("y1", -lineLength/2)
          .attr("x2", -gap)
          .attr("y2", lineLength/2)
          .attr("stroke", currentProject.color)
          .attr("stroke-width", strokeWidth)
          .attr("stroke-linecap", "round");
          
        // Right line
        group.append("line")
          .attr("x1", gap)
          .attr("y1", -lineLength/2)
          .attr("x2", gap)
          .attr("y2", lineLength/2)
          .attr("stroke", currentProject.color)
          .attr("stroke-width", strokeWidth)
          .attr("stroke-linecap", "round");
      }
    });

    // Node labels
    nodeGroups.append("text")
      .attr("dy", (d: GraphNode) => d.type === 'mainline' ? 25 : -15)
      .attr("text-anchor", "middle")
      .text((d: GraphNode) => d.title)
      .attr("font-size", (d: GraphNode) => d.type === 'mainline' ? "14px" : "12px")
      .attr("font-weight", (d: GraphNode) => d.type === 'mainline' ? "bold" : "normal")
      .attr("fill", "#1e293b")
      .style("pointer-events", "none");

  }, [graphData, currentProject, openTaskModal, toggleProjectEdge]);

  const handleCreateMainlineTask = () => {
    if (!currentProject) return;
    
    // Find the last mainline task to set as dependency
    const mainlineTasks = projectTasks.filter(t => t.projectNodeType === 'mainline');
    const lastMainline = mainlineTasks.length > 0 ? mainlineTasks[mainlineTasks.length - 1] : null;
    
    addTask({
      title: '新主线站点',
      projectId: currentProject.id,
      projectNodeType: 'mainline',
      dependencies: lastMainline ? [lastMainline.id] : [],
    });
  };

  const handleCreateBranchTask = () => {
    if (!currentProject) return;
    
    // Find the last mainline task to set as parent
    const mainlineTasks = projectTasks.filter(t => t.projectNodeType === 'mainline');
    const lastMainline = mainlineTasks.length > 0 ? mainlineTasks[mainlineTasks.length - 1] : null;

    addTask({
      title: '新支线任务',
      projectId: currentProject.id,
      projectNodeType: 'branch',
      parentId: lastMainline ? lastMainline.id : undefined,
    });
  };

  if (viewMode === 'grid' || !currentProject) {
    const filteredProjects = projects
      .filter(p => !!p.isArchived === showArchived)
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
      <div className="h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)] flex flex-col bg-[#f8fafc] md:rounded-xl md:shadow-sm md:border border-slate-200 overflow-hidden">
        {/* Grid Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <div className="hidden md:flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <LayoutGrid className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">项目中心</h1>
              <p className="text-sm text-slate-500">管理您的所有地铁线路图</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="搜索项目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 w-48 transition-all"
              />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setShowArchived(false)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  !showArchived 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                活跃项目
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  showArchived 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                已归档
              </button>
            </div>
            
            <button
              onClick={() => setIsCreatingProject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus size={18} />
              新建项目
            </button>
          </div>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="projects-grid" direction="horizontal" isDropDisabled={!!searchQuery.trim()}>
              {(provided) => (
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {/* New Project Card */}
                  {isCreatingProject && (
                    <Draggable draggableId="creating-project" index={0} isDragDisabled={true}>
                      {(provided) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 p-6 flex flex-col animate-in fade-in zoom-in duration-200"
                        >
                          <h3 className="text-lg font-bold text-slate-800 mb-4">新建项目</h3>
                          <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">项目名称</label>
                              <input
                                type="text"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="例如：Q3 营销计划"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">主题颜色</label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={newProjectColor}
                                  onChange={(e) => setNewProjectColor(e.target.value)}
                                  className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer overflow-hidden"
                                />
                                <span className="text-sm font-mono text-slate-500 uppercase">{newProjectColor}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all">
                                创建
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setIsCreatingProject(false)}
                                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                              >
                                取消
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </Draggable>
                  )}

                  {filteredProjects.map((p, index) => {
                    const pTasks = tasks.filter(t => t.projectId === p.id);
                    const doneCount = pTasks.filter(t => t.state === 'done').length;
                    const progress = pTasks.length > 0 ? Math.round((doneCount / pTasks.length) * 100) : 0;

                    if (isEditingProject && selectedProjectId === p.id) {
                      return (
                        // @ts-ignore - React 19 type issue with @hello-pangea/dnd
                        <Draggable key={p.id} draggableId={p.id} index={index + (isCreatingProject ? 1 : 0)} isDragDisabled={true}>
                          {(provided) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white rounded-2xl border-2 border-indigo-500 p-6 shadow-xl shadow-indigo-100 animate-in fade-in zoom-in duration-200"
                            >
                              <h3 className="text-lg font-bold text-slate-800 mb-4">修改项目</h3>
                              <form onSubmit={handleUpdateProject} className="space-y-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">项目名称</label>
                                  <input
                                    type="text"
                                    value={editProjectName}
                                    onChange={(e) => setEditProjectName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">主题颜色</label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="color"
                                      value={editProjectColor}
                                      onChange={(e) => setEditProjectColor(e.target.value)}
                                      className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer overflow-hidden"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-sm font-mono text-slate-500 uppercase">{editProjectColor}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <button 
                                    type="submit" 
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    保存
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setIsEditingProject(false); }}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                                  >
                                    取消
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                        </Draggable>
                      );
                    }

                    return (
                      // @ts-ignore - React 19 type issue with @hello-pangea/dnd
                      <Draggable key={p.id} draggableId={p.id} index={index + (isCreatingProject ? 1 : 0)} isDragDisabled={!!searchQuery.trim()}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => handleSelectProject(p.id)}
                            className={`group bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-pointer relative overflow-hidden ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-indigo-500 rotate-2 z-50' : ''}`}
                          >
                            {/* Color Strip */}
                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: p.color }}></div>
                            
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: `${p.color}15`, color: p.color }}>
                                <GitMerge size={24} />
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedProjectId(p.id); handleStartEditProject(); }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); updateProject(p.id, { isArchived: !p.isArchived }); }}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-lg"
                                >
                                  {p.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                                </button>
                              </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                            <div className="flex items-center gap-2 mb-6">
                              <span className="text-xs font-medium text-slate-400">{pTasks.length} 个任务</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                              <span className="text-xs font-medium text-slate-400">{progress}% 已完成</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full transition-all duration-500 ease-out"
                                style={{ backgroundColor: p.color, width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}

                  {filteredProjects.length === 0 && !isCreatingProject && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                      <LayoutGrid size={64} className="mb-4 opacity-10" />
                      <p className="text-lg font-medium">暂无{showArchived ? '已归档' : '活跃'}项目</p>
                      <button 
                        onClick={() => setIsCreatingProject(true)}
                        className="mt-4 text-indigo-600 font-bold hover:underline"
                      >
                        立即创建一个
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-white md:rounded-xl md:shadow-sm md:border border-slate-200 overflow-hidden ${
      viewMode === 'detail' 
        ? 'fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:h-[calc(100vh-8rem)] safe-area-top' 
        : 'h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)]'
    }`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-slate-200 bg-slate-50 gap-4">
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setViewMode('grid')}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 shadow-none hover:shadow-sm shrink-0"
            title="返回项目中心"
          >
            <ArrowLeftCircle size={24} />
          </button>
          
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <GitMerge className="text-indigo-600" size={24} />
            <h1 className="text-xl font-bold text-slate-800">项目详情</h1>
          </div>
          
          {/* Project Selector (Tabs) */}
          <div className="flex items-center gap-1 md:ml-4 bg-slate-200/50 p-1 rounded-xl overflow-x-auto flex-1 md:max-w-[400px] no-scrollbar">
            {projects.filter(p => !p.isArchived).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  selectedProjectId === p.id 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                {p.name}
              </button>
            ))}
          </div>
        </div>
        
        {currentProject && (
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar shrink-0">
            {isEditingProject ? (
              <form onSubmit={handleUpdateProject} className="flex items-center gap-2 mr-4 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="px-2 py-1 text-sm focus:outline-none"
                  autoFocus
                />
                <input
                  type="color"
                  value={editProjectColor}
                  onChange={(e) => setEditProjectColor(e.target.value)}
                  className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                />
                <button type="submit" className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">
                  保存
                </button>
                <button type="button" onClick={() => setIsEditingProject(false)} className="text-xs text-slate-500 hover:text-slate-700">
                  取消
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1 mr-4">
                <button
                  onClick={handleStartEditProject}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="修改项目"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={handleToggleArchiveProject}
                  className={`p-1.5 rounded-lg transition-colors ${
                    currentProject.isArchived 
                      ? 'text-amber-600 hover:bg-amber-50' 
                      : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                  title={currentProject.isArchived ? "取消归档" : "归档项目"}
                >
                  {currentProject.isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                </button>
              </div>
            )}


            {!currentProject.isArchived && (
              <>
                <button 
                  onClick={handleCreateMainlineTask}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                  <Plus size={16} />
                  添加主线站点
                </button>
                <button 
                  onClick={handleCreateBranchTask}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  <Plus size={16} />
                  添加支线任务
                </button>
              </>
            )}
            <button 
              onClick={handleDeleteProject}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="删除项目"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative bg-[#f8fafc] overflow-hidden">
        {currentProject ? (
          <>
            <svg ref={svgRef} className="w-full h-full" onClick={() => setActiveMenuNodeId(null)} />
            
            {/* Context Menu */}
            {activeMenuNodeId && currentProject && (
              <div 
                ref={menuRef}
                className="absolute z-10 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex items-center p-1 gap-1"
                style={{
                  // Position will be updated via D3
                  top: '-1000px',
                  left: '-1000px',
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddBefore(activeMenuNodeId); }}
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                  title="在左侧添加前置任务"
                >
                  <ArrowLeft size={18} className="mb-1" />
                  <span className="text-[10px] font-medium">前置</span>
                </button>
                <div className="w-px h-10 bg-slate-200 mx-1"></div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddAfter(activeMenuNodeId); }}
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                  title="在右侧添加后置任务"
                >
                  <ArrowRight size={18} className="mb-1" />
                  <span className="text-[10px] font-medium">后置</span>
                </button>
                <div className="w-px h-10 bg-slate-200 mx-1"></div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenReplaceModal(activeMenuNodeId); }}
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                  title="替换节点"
                >
                  <RefreshCw size={18} className="mb-1" />
                  <span className="text-[10px] font-medium">替换</span>
                </button>
                <div className="w-px h-10 bg-slate-200 mx-1"></div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddBranch(activeMenuNodeId); }}
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                  title="增加支线任务"
                >
                  <GitBranch size={18} className="mb-1" />
                  <span className="text-[10px] font-medium">支线</span>
                </button>
                <div className="w-px h-10 bg-slate-200 mx-1"></div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteNode(activeMenuNodeId); }}
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  title="删除此任务"
                >
                  <Trash2 size={18} className="mb-1" />
                  <span className="text-[10px] font-medium">删除</span>
                </button>
              </div>
            )}

            {/* Legend / Instructions */}
            <div className="hidden md:flex absolute bottom-4 left-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-sm border border-slate-200 text-xs text-slate-600 flex-col gap-3">
              <div className="flex gap-6">
                {/* Node Types */}
                <div>
                  <div className="font-bold text-slate-700 mb-2">节点大小</div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full border-[3px]" style={{ borderColor: currentProject.color }}></div>
                    <span>主线</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: currentProject.color }}></div>
                    <span>支线</span>
                  </div>
                </div>
                
                {/* Task States */}
                <div>
                  <div className="font-bold text-slate-700 mb-2">任务状态</div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 bg-white" style={{ borderColor: currentProject.color }}></div>
                    <span>待办</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: currentProject.color, borderStyle: 'dashed' }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentProject.color }}></div>
                    </div>
                    <span>进行中/审核</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: currentProject.color }}></div>
                    <span>已完成</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center bg-white gap-[1px]" style={{ borderColor: currentProject.color }}>
                      <div className="w-[2px] h-1.5 rounded-sm" style={{ backgroundColor: currentProject.color }}></div>
                      <div className="w-[2px] h-1.5 rounded-sm" style={{ backgroundColor: currentProject.color }}></div>
                    </div>
                    <span>延期</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 text-slate-400">
                提示: 滚动缩放，拖拽平移。点击节点查看详情。
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <GitMerge size={48} className="mb-4 opacity-20" />
            <p>请选择或创建一个项目</p>
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={isDeleteNodeModalOpen}
        title="删除任务"
        message="确定要删除此任务吗？"
        onConfirm={confirmDeleteNode}
        onCancel={() => setIsDeleteNodeModalOpen(false)}
      />
      <ConfirmationModal
        isOpen={isDeleteProjectModalOpen}
        title="删除项目"
        message="确定要删除此项目吗？项目中的任务将被保留为普通任务。"
        onConfirm={confirmDeleteProject}
        onCancel={() => setIsDeleteProjectModalOpen(false)}
      />

      <ReplaceNodeModal
        isOpen={isReplaceModalOpen}
        onClose={() => setIsReplaceModalOpen(false)}
        onReplace={confirmReplaceNode}
        tasks={tasks}
        currentProjectId={selectedProjectId || ''}
      />
    </div>
  );
}

interface ReplaceNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: (selectedTaskId: string) => void;
  tasks: Task[];
  currentProjectId: string;
}

function ReplaceNodeModal({ isOpen, onClose, onReplace, tasks, currentProjectId }: ReplaceNodeModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen) return null;

  const availableTasks = tasks.filter(t => t.projectId !== currentProjectId && 
    (t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
     t.description?.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800">选择替换任务</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-100">
          <input
            type="text"
            placeholder="搜索任务库..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {availableTasks.length > 0 ? (
            availableTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onReplace(task.id)}
                className="w-full text-left p-3 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-all group flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold">{task.title}</div>
                  {task.description && <div className="text-xs text-slate-500 group-hover:text-indigo-500 line-clamp-1">{task.description}</div>}
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400" />
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 italic">
              没有找到可用的任务
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
