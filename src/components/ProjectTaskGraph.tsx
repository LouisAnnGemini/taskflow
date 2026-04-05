import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Task, GraphNode } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';
import { ArrowLeft, ArrowRight, GitBranch, Trash2 } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface ProjectTaskGraphProps {
  taskId: string;
}

export function ProjectTaskGraph({ taskId }: ProjectTaskGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeMenuNodeId, setActiveMenuNodeId] = useState<string | null>(null);
  const activeMenuNodeIdRef = useRef<string | null>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  
  const { getTask, tasks, projects, openTaskModal, addTask, updateTask, deleteTask, toggleProjectEdge } = useTaskStore();
  const task = getTask(taskId);
  
  const currentProject = projects.find(p => p.id === task?.projectId);
  const projectTasks = tasks.filter(t => t.projectId === task?.projectId);

  // Sync state to ref for D3 callbacks
  useEffect(() => {
    activeMenuNodeIdRef.current = activeMenuNodeId;
  }, [activeMenuNodeId]);

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

    updateTask(targetTask.id, { dependencies: [newTaskId] });
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
      parentId: targetTask.parentId,
    });

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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

  const handleDeleteNode = (nodeId: string) => {
    setNodeToDelete(nodeId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteNode = () => {
    if (!nodeToDelete) return;
    const targetTask = tasks.find(t => t.id === nodeToDelete);
    if (!targetTask) return;

    const dependentTasks = tasks.filter(t => t.dependencies?.includes(targetTask.id));
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
    setIsDeleteModalOpen(false);
    setNodeToDelete(null);
    setActiveMenuNodeId(null);
  };

  // Layout Algorithm (copied from ProjectView)
  const graphData = useMemo(() => {
    if (!currentProject || !task) return null;

    const nodes: any[] = [];
    const links: any[] = [];
    
    // 1. Identify mainline tasks
    const mainlineTasks = projectTasks.filter(t => t.projectNodeType === 'mainline');
    
    const mainlineMap = new Map(mainlineTasks.map(t => [t.id, t]));
    const mainlineRoots = mainlineTasks.filter(t => !t.dependencies || t.dependencies.filter(d => mainlineMap.has(d)).length === 0);
    
    const sortedMainline: Task[] = [];
    const visited = new Set<string>();
    
    const visit = (t: Task) => {
      if (visited.has(t.id)) return;
      visited.add(t.id);
      sortedMainline.push(t);
      
      const nextTasks = mainlineTasks.filter(nt => nt.dependencies?.includes(t.id));
      nextTasks.forEach(visit);
    };
    
    mainlineRoots.forEach(visit);
    // Add any disconnected mainline tasks
    mainlineTasks.forEach(t => {
      if (!visited.has(t.id)) visit(t);
    });

    const nodePositions = new Map<string, { x: number, y: number }>();
    
    // Assign coordinates to mainline
    sortedMainline.forEach((t, index) => {
      nodePositions.set(t.id, { x: index * 2, y: 0 }); // Use 2 units for X to allow 0.5 offsets easily
      nodes.push({ ...t, x: index * 2, y: 0, type: 'mainline' });
      
      // Add horizontal links
      if (t.dependencies) {
        t.dependencies.forEach(depId => {
          if (mainlineMap.has(depId)) {
            links.push({ id: `${depId}-${t.id}`, source: depId, target: t.id, type: 'horizontal', isMainline: true });
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
  }, [currentProject, projectTasks, task]);

  // Render D3 Graph
  useEffect(() => {
    if (!graphData || !svgRef.current || !currentProject || !task) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const UNIT_X = 120;
    const UNIT_Y = 80;
    
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
    
    // Find current task node to center on it
    const currentTaskNode = graphData.nodes.find(n => n.id === task.id);
    
    let initialX = width / 2;
    let initialY = height / 2;
    const initialScale = 0.8;

    if (currentTaskNode) {
        initialX = width / 2 - currentTaskNode.x * UNIT_X * initialScale;
        initialY = height / 2 - currentTaskNode.y * UNIT_Y * initialScale;
    }

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

    // Highlight current task
    nodeGroups.filter((d: GraphNode) => d.id === task.id)
      .append("circle")
      .attr("r", (d: GraphNode) => d.type === 'mainline' ? 20 : 16)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b") // Amber highlight
      .attr("stroke-width", 4)
      .attr("stroke-dasharray", "4,4")
      .attr("class", "animate-[spin_4s_linear_infinite]");

    // Node circles (Stations)
    nodeGroups.append("circle")
      .attr("r", (d: GraphNode) => d.type === 'mainline' ? 12 : 8)
      .attr("fill", "#fff")
      .attr("stroke", currentProject.color)
      .attr("stroke-width", (d: GraphNode) => d.type === 'mainline' ? 4 : 2);

    // Inner dot for completed tasks
    nodeGroups.filter((d: GraphNode) => d.state === 'done')
      .append("circle")
      .attr("r", (d: GraphNode) => d.type === 'mainline' ? 6 : 4)
      .attr("fill", currentProject.color);

    // Node labels
    nodeGroups.append("text")
      .attr("dy", (d: GraphNode) => d.type === 'mainline' ? 25 : -15)
      .attr("text-anchor", "middle")
      .text((d: GraphNode) => d.title)
      .attr("font-size", (d: GraphNode) => d.type === 'mainline' ? "14px" : "12px")
      .attr("font-weight", (d: GraphNode) => d.id === task.id ? "bold" : (d.type === 'mainline' ? "bold" : "normal"))
      .attr("fill", (d: GraphNode) => d.id === task.id ? "#f59e0b" : "#1e293b")
      .style("pointer-events", "none");

  }, [graphData, currentProject, task, openTaskModal, toggleProjectEdge]);

  if (!currentProject) return null;

  return (
    <div className="relative w-full h-[400px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 600 400" style={{ cursor: 'grab' }} onClick={() => setActiveMenuNodeId(null)} />
      
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

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="删除任务"
        message="确定要删除此任务吗？"
        onConfirm={confirmDeleteNode}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg shadow-sm border border-slate-200 text-xs space-y-2 backdrop-blur-sm">
        <div className="font-medium text-slate-700 mb-1">项目图例</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500"></span>
          <span className="text-slate-600">当前任务</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: currentProject.color }}></span>
          <span className="text-slate-600">主线任务</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full border-2" style={{ borderColor: currentProject.color }}></span>
          <span className="text-slate-600">支线任务</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentProject.color }}></span>
          <span className="text-slate-600">已完成</span>
        </div>
      </div>
    </div>
  );
}
