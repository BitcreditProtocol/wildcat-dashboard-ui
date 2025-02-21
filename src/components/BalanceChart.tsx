import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart"

const config = {
  bitcoin: {
    label: "Bitcoin",
    color: "#2563eb",
  },
} satisfies ChartConfig

export function BalanceChart() {
  const data = [
    { month: "January", bitcoin: 186 },
    { month: "February", bitcoin: 305 },
    { month: "March", bitcoin: 237 },
    { month: "April", bitcoin: 73 },
    { month: "May", bitcoin: 209 },
    { month: "June", bitcoin: 214 },
    { month: "July", bitcoin: 21 },
    { month: "August", bitcoin: 32 },
    { month: "September", bitcoin: 0 },
    { month: "October", bitcoin: 0 },
    { month: "November", bitcoin: 0 },
    { month: "December", bitcoin: 0 },
  ]

  return (
    <ChartContainer config={config} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) => value.slice(0, 3)}
        />
        <YAxis dataKey="bitcoin" tickLine={false} tickMargin={10} axisLine={false} />
        <Bar dataKey="bitcoin" fill="var(--color-bitcoin)" radius={4} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}
