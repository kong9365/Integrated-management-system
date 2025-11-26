import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithRangeProps {
  date?: { from: Date; to: Date };
  onDateChange?: (date: { from: Date; to: Date }) => void;
}

export function DatePickerWithRange({
  date,
  onDateChange,
}: DatePickerWithRangeProps) {
  const [fromDate, setFromDate] = React.useState<Date | undefined>(
    date?.from
  );
  const [toDate, setToDate] = React.useState<Date | undefined>(date?.to);

  React.useEffect(() => {
    if (date) {
      setFromDate(date.from);
      setToDate(date.to);
    }
  }, [date]);

  const handleFromDateSelect = (selectedDate: Date | undefined) => {
    setFromDate(selectedDate);
    if (selectedDate && toDate && onDateChange) {
      onDateChange({ from: selectedDate, to: toDate });
    }
  };

  const handleToDateSelect = (selectedDate: Date | undefined) => {
    setToDate(selectedDate);
    if (fromDate && selectedDate && onDateChange) {
      onDateChange({ from: fromDate, to: selectedDate });
    }
  };

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !fromDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {fromDate ? format(fromDate, "yyyy-MM-dd") : "시작일"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={fromDate}
            onSelect={handleFromDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !toDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {toDate ? format(toDate, "yyyy-MM-dd") : "종료일"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={toDate}
            onSelect={handleToDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

