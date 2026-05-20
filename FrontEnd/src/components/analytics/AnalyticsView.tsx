import * as React from 'react';
import { cn } from '../../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Flame, 
  CheckCircle2, 
  Clock, 
  ChevronDown,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

const barData = [
  { day: 'Mon', completed: 6 },
  { day: 'Tue', completed: 9 },
  { day: 'Wed', completed: 4 },
  { day: 'Thu', completed: 12 },
  { day: 'Fri', completed: 15 },
  { day: 'Sat', completed: 3 },
  { day: 'Sun', completed: 0 },
];

const categoryData = [
  { name: 'Work', value: 45, color: '#1978e5' },
  { name: 'Study', value: 30, color: '#5cde94' },
  { name: 'Personal', value: 20, color: '#ffb68c' },
  { name: 'Errands', value: 5, color: '#8b919f' },
];

export function AnalyticsView() {
  return (
    <div className="h-full bg-slate-50/50">
      <ScrollArea className="h-full px-10 py-10">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Insights Engine</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">Performance Metrics</h1>
              <p className="text-sm text-slate-500 mt-2 font-medium">Systematic analysis of your productivity architecture over the last 7 cycles.</p>
            </div>
            <Button variant="outline" className="bg-white border-slate-200 hover:border-blue-600 text-slate-600 font-bold rounded-xl h-11 px-6 shadow-sm flex items-center justify-between gap-4 transition-all">
              <span>Current Week</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard 
              title="Completion Streak" 
              value="12" 
              unit="days" 
              trend="+2 days vs avg" 
              trendType="up"
              icon={Flame} 
              iconColor="text-orange-500 bg-orange-50"
            />
            <StatCard 
              title="Tasks Completed" 
              value="48" 
              trend="15% efficiency boost" 
              trendType="up"
              icon={CheckCircle2} 
              iconColor="text-blue-600 bg-blue-50"
            />
            <StatCard 
              title="Total Focus Time" 
              value="14h 30m" 
              trend="Avg 2h 04m / session" 
              icon={Clock} 
              iconColor="text-purple-600 bg-purple-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            {/* Bar Chart */}
            <Card className="lg:col-span-2 bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Velocity Output
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[350px] p-8 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                      cursor={{ fill: 'rgba(37,99,235,0.05)', radius: 8 }}
                    />
                    <Bar 
                      dataKey="completed" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={45}
                    >
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.completed > 10 ? '#2563eb' : '#cbd5e1'} className="transition-all duration-300" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Categories Pie */}
            <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-blue-600" />
                  Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-[350px] p-8 pt-0">
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {categoryData.map((item) => (
                    <div key={item.name} className="flex flex-col p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.name}</span>
                      </div>
                      <span className="text-base font-bold text-slate-900">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  unit = '', 
  trend, 
  trendType,
  icon: Icon, 
  iconColor 
}: { 
  title: string, 
  value: string, 
  unit?: string, 
  trend?: string, 
  trendType?: 'up' | 'down',
  icon: any, 
  iconColor?: string 
}) {
  return (
    <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl p-6 transition-all hover:scale-[1.02] duration-300">
      <CardHeader className="flex flex-row items-center justify-between p-0 pb-6">
        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{title}</CardTitle>
        <div className={cn("p-2.5 rounded-xl shadow-sm", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tight text-slate-900">{value}</span>
          {unit && <span className="text-lg font-bold text-slate-400">{unit}</span>}
        </div>
        {trend && (
          <div className="flex items-center gap-2 mt-4">
             <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
              trendType === 'up' ? "bg-green-50 text-green-600" : trendType === 'down' ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-400"
            )}>
              {trendType === 'up' && <TrendingUp className="h-3 w-3" />}
              {trendType === 'down' && <TrendingDown className="h-3 w-3" />}
              <span>{trend}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { BarChart3, LayoutGrid } from 'lucide-react';
