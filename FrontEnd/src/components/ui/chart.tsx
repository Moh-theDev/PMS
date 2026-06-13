import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format config
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
    theme?: Record<string, string>
  }
>

const ChartContext = React.createContext<{
  config: ChartConfig
} | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer")
  }
  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
  }
>(({ id, className, config, children, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-grid-horizontal_line]:stroke-border [&_.recharts-cartesian-grid-vertical_line]:stroke-border [&_.recharts-curve.recharts-line]:stroke-primary [&_.recharts-dot]:stroke-background [&_.recharts-active-dot]:stroke-background [&_.recharts-legend-item]:text-foreground [&_.recharts-pie-label-text]:fill-foreground [&_.recharts-polar-grid-concentric-path]:stroke-border [&_.recharts-polar-grid-radial-line]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-sector]:stroke-background [&_.recharts-sector]:stroke-2 [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            #${chartId} {
              ${Object.entries(config)
                .map(([key, val]) => val.color ? `--color-${key}: ${val.color};` : "")
                .join("\n")}
            }
          `
        }} />
        <RechartsPrimitive.ResponsiveContainer id={chartId} width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    active?: boolean
    payload?: any[]
    label?: string
    labelFormatter?: (value: any, payload: any[]) => React.ReactNode
    labelClassName?: string
    formatter?: (value: any, name: any, item: any, index: any) => React.ReactNode
    indicator?: "dot" | "line" | "dashed"
    hideLabel?: boolean
    hideIndicator?: boolean
  }
>(
  (
    {
      active,
      payload,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      className,
    },
    ref
  ) => {
    const { config } = useChart()

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-xl border border-border bg-popover px-3.5 py-2.5 text-xs shadow-xl dark:shadow-none backdrop-blur-sm",
          className
        )}
      >
        {!hideLabel && (
          <div className={cn("font-bold text-foreground", labelClassName)}>
            {labelFormatter ? labelFormatter(label, payload) : label}
          </div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = item.dataKey || item.name
            const itemConfig = config[key] || config[item.name]
            const name = itemConfig?.label || item.name
            const color = itemConfig?.color || item.payload?.fill || item.color

            return (
              <div key={index} className="flex items-center gap-2">
                {!hideIndicator && (
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      indicator === "dashed" && "border-dashed"
                    )}
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="text-muted-foreground font-medium">{name}:</span>
                <span className="font-bold text-foreground tabular-nums">
                  {formatter ? formatter(item.value, name, item, index) : item.value}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export { ChartContainer, ChartTooltip, ChartTooltipContent }
