// Meals screen on CalendarView. renderDay shows a 🍽️ on days with a menu;
// renderDetails shows that day's Breakfast/Lunch/Snack with auto-matched emojis.
// Tabs switch School ↔ Daycare. Principal gets the weekly Plan Meals dialog.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { DayMeal, MealMenu } from "@/lib/meals";
import { emojiFor } from "@/lib/meal-emoji";
import { CalendarView } from "@/components/calendar-view";
import { WeeklyPlanner } from "@/components/meals/weekly-planner";
import { dayKey, todayKey, formatKey } from "@/lib/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function MenuBlock({ menu }: { menu: MealMenu }) {
  const Row = ({ label, items }: { label: string; items: string[] }) =>
    items.length === 0 ? null : (
      <div className="text-sm">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p>{items.map((it, i) => <span key={i} className="mr-2 inline-block">{emojiFor(it)} {it}</span>)}</p>
      </div>
    );
  if (menu.breakfast.length + menu.lunch.length + menu.snack.length === 0)
    return <p className="text-sm text-muted-foreground">No menu planned.</p>;
  return (
    <div className="space-y-2">
      <Row label="Breakfast" items={menu.breakfast} />
      <Row label="Lunch" items={menu.lunch} />
      <Row label="Snack" items={menu.snack} />
    </div>
  );
}

export function MealsView({ editable, endpoint, hasDaycare = true }: { editable: boolean; endpoint: string; hasDaycare?: boolean }) {
  const now = new Date();
  const [type, setType] = useState<"SCHOOL" | "DAYCARE">("SCHOOL");
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [meals, setMeals] = useState<DayMeal[]>([]);
  const [plannerOpen, setPlannerOpen] = useState(false);

  const load = useCallback(async (y: number, m: number, t: string) => {
    const res = await fetch(`${endpoint}?year=${y}&month=${m}&type=${t}`);
    const json = await res.json();
    setMeals(json.data ?? []);
  }, [endpoint]);
  useEffect(() => { load(year, month, type); }, [year, month, type, load]);

  const todays = useMemo(() => meals.find((m) => dayKey(m.date) === todayKey())?.menu ?? null, [meals]);
  const showDaycareTab = editable || hasDaycare;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Meals</h1>
        {editable && <Button className="gap-1" onClick={() => setPlannerOpen(true)}><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">Plan Meals</span></Button>}
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as "SCHOOL" | "DAYCARE")}>
        <TabsList>
          <TabsTrigger value="SCHOOL">{editable ? "School Meals" : "School Menu"}</TabsTrigger>
          {showDaycareTab && <TabsTrigger value="DAYCARE">{editable ? "Daycare Meals" : "Daycare Menu"}</TabsTrigger>}
        </TabsList>
      </Tabs>

      {/* Today's Menu — prominent */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-semibold">Today&apos;s Menu</p>
          {todays ? <MenuBlock menu={todays} /> : <p className="text-sm text-muted-foreground">No menu planned for today.</p>}
        </CardContent>
      </Card>

      <CalendarView
        year={year} month={month}
        onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
        items={meals}
        squareCells={false}
        renderDay={(key, items) => (items.length > 0 ? <span className="text-base">🍽️</span> : null)}
        renderDetails={(key, items) => (
          <div className="space-y-2">
            {items[0] ? <MenuBlock menu={items[0].menu} /> : <p className="text-sm text-muted-foreground">No menu planned.</p>}
            {editable && <Button size="sm" variant="outline" className="w-full" onClick={() => setPlannerOpen(true)}>Plan this week</Button>}
          </div>
        )}
      />

      {editable && <WeeklyPlanner open={plannerOpen} onOpenChange={setPlannerOpen} type={type} onSaved={() => load(year, month, type)} />}
    </div>
  );
}
