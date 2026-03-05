import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Task } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';

interface GraphProps {
  taskId: string;
}

export function TaskGraph({ taskId }: GraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { getTask, tasks, setSelectedTaskId } = useTaskStore();
  const task = getTask(taskId);

  useEffect(() => {
    if (!svgRef.current || !task) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 400;

    const nodes: { id: string; title: string; state: string }[] = [{ id: task.id, title: task.title, state: task.state }];
    const links: { source: string; target: string }[] = [];

    (task.relatedTaskIds || []).forEach(relatedId => {
      const relatedTask = getTask(relatedId);
      if (relatedTask) {
        nodes.push({ id: relatedTask.id, title: relatedTask.title, state: relatedTask.state });
        links.push({ source: task.id, target: relatedTask.id });
      }
    });

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6);

    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', (d: any) => d.id === task.id ? 18 : 12)
      .attr('fill', (d: any) => {
        if (d.id === task.id) return '#8b5cf6'; // Purple
        switch (d.state) {
          case 'todo': return '#fecaca'; // Light red
          case 'in_progress': return '#fef08a'; // Light yellow
          case 'in_review': return '#bfdbfe'; // Light blue
          case 'done': return '#bbf7d0'; // Light green
          case 'snoozed': return '#e2e8f0'; // Light gray
          default: return '#e2e8f0'; // Default light gray
        }
      })
      .attr('cursor', 'pointer')
      .on('click', (event, d: any) => {
        setSelectedTaskId(d.id);
      })
      .call(d3.drag<SVGCircleElement, unknown>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any);

    const label = g.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text((d: any) => d.title)
      .attr('font-size', 12)
      .attr('dx', 14)
      .attr('dy', 4)
      .attr('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });
  }, [task, tasks, setSelectedTaskId]);

  return (
    <div className="relative w-full h-[400px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 600 400" style={{ cursor: 'grab' }} />
      
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg shadow-sm border border-slate-200 text-xs space-y-2 backdrop-blur-sm">
        <div className="font-medium text-slate-700 mb-1">图例</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#8b5cf6]"></span>
          <span className="text-slate-600">当前任务</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#fecaca]"></span>
          <span className="text-slate-600">待办</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#fef08a]"></span>
          <span className="text-slate-600">进行中</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#bfdbfe]"></span>
          <span className="text-slate-600">审核中</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#bbf7d0]"></span>
          <span className="text-slate-600">已完成</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#e2e8f0]"></span>
          <span className="text-slate-600">延期</span>
        </div>
      </div>
    </div>
  );
}
