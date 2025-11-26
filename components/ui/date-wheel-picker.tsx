// components/ui/date-wheel-picker.tsx
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface DateWheelPickerProps {
  value?: string // ISO date string (YYYY-MM-DD)
  onChange?: (date: string) => void
  minDate?: string // ISO date string
  maxDate?: string // ISO date string
  placeholder?: string
  className?: string
  disabled?: boolean
  label?: string // Label to display at the top of the date picker modal
}

export function DateWheelPicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date",
  className,
  disabled = false,
  label,
}: DateWheelPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const yearScrollRef = useRef<HTMLDivElement>(null)
  const monthScrollRef = useRef<HTMLDivElement>(null)
  const dayScrollRef = useRef<HTMLDivElement>(null)

  // Detect mobile vs desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Get closest valid date to today
  const getClosestValidDate = (): { year: number; month: number; day: number } | null => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
    
    // Check if today is within constraints
    if (minDate && todayStr < minDate) {
      // Today is before minDate, use minDate
      const min = new Date(minDate)
      return {
        year: min.getFullYear(),
        month: min.getMonth() + 1,
        day: min.getDate()
      }
    }
    
    if (maxDate && todayStr > maxDate) {
      // Today is after maxDate, use maxDate
      const max = new Date(maxDate)
      return {
        year: max.getFullYear(),
        month: max.getMonth() + 1,
        day: max.getDate()
      }
    }
    
    // Today is valid, use today
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate()
    }
  }

  // Parse initial value or set to closest valid date
  useEffect(() => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setSelectedYear(date.getFullYear())
        setSelectedMonth(date.getMonth() + 1)
        setSelectedDay(date.getDate())
      }
    } else {
      // No value provided, set to closest valid date to today
      const closestDate = getClosestValidDate()
      if (closestDate) {
        setSelectedYear(closestDate.year)
        setSelectedMonth(closestDate.month)
        setSelectedDay(closestDate.day)
      } else {
        setSelectedYear(null)
        setSelectedMonth(null)
        setSelectedDay(null)
      }
    }
  }, [value, minDate, maxDate])

  // Generate year options
  const getYearOptions = () => {
    const years: number[] = []
    const currentYear = new Date().getFullYear()
    const minYear = minDate ? new Date(minDate).getFullYear() : currentYear - 10
    const maxYear = maxDate ? new Date(maxDate).getFullYear() : currentYear + 20
    
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y)
    }
    return years
  }

  // Generate month options
  const getMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1)
  }

  // Generate day options based on selected year/month
  const getDayOptions = () => {
    if (!selectedYear || !selectedMonth) return []
    
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    const days: number[] = []
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      
      // Check if this day is within min/max constraints
      if (minDate && dateStr < minDate) continue
      if (maxDate && dateStr > maxDate) continue
      
      days.push(d)
    }
    
    return days
  }

  // Check if a specific date is valid
  const isDateValid = (year: number, month: number, day: number): boolean => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (minDate && dateStr < minDate) return false
    if (maxDate && dateStr > maxDate) return false
    return true
  }

  // Filter months based on selected year
  const getValidMonths = () => {
    // Always return all 12 months - let day filtering handle date restrictions
    return getMonthOptions()
  }

  // Filter years based on constraints
  const getValidYears = () => {
    return getYearOptions().filter(year => {
      // Check if any month/day in this year is valid
      const firstOfYear = `${year}-01-01`
      const lastOfYear = `${year}-12-31`
      
      if (minDate && lastOfYear < minDate) return false
      if (maxDate && firstOfYear > maxDate) return false
      
      return true
    })
  }

  // Apply blur effect to buttons based on distance from center
  const applyBlurToButtons = (scrollRef: React.RefObject<HTMLDivElement>) => {
    if (!scrollRef.current) return
    
    const container = scrollRef.current
    const containerHeight = container.clientHeight
    const centerY = containerHeight / 2
    const allButtons = Array.from(container.children).filter(c => c.tagName === 'BUTTON') as HTMLElement[]
    
    allButtons.forEach((button) => {
      const rect = button.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const buttonCenter = rect.top + rect.height / 2 - containerRect.top
      const distance = Math.abs(buttonCenter - centerY)
      
      // Calculate blur intensity based on distance from center
      // More blur for items further from center (at top/bottom edges)
      // Center items (within ~24px of center) have no blur
      const centerThreshold = 24 // Pixels from center where blur starts
      const maxDistance = containerHeight / 2
      
      let blurAmount = 0
      if (distance > centerThreshold) {
        // Only apply blur if beyond the center threshold
        const effectiveDistance = distance - centerThreshold
        const effectiveMaxDistance = maxDistance - centerThreshold
        blurAmount = Math.min((effectiveDistance / effectiveMaxDistance) * 1.5, 1.5) // Max 1.5px blur at edges
      }
      
      const opacity = Math.max(1 - (distance / maxDistance) * 0.2, 0.8) // Slight opacity reduction at edges
      
      button.style.filter = blurAmount > 0 ? `blur(${blurAmount}px)` : 'none'
      button.style.opacity = opacity.toString()
    })
  }

  // Snap scroll to center and update selected value
  const snapToCenter = (
    scrollRef: React.RefObject<HTMLDivElement>, 
    items: any[], 
    setValue: (value: any) => void, 
    getItemValue: (item: any) => any,
    itemHeight: number = 48
  ) => {
    if (!scrollRef.current || items.length === 0) return
    
    const container = scrollRef.current
    const containerHeight = container.clientHeight
    const centerY = containerHeight / 2
    
    // Apply blur effect to buttons
    applyBlurToButtons(scrollRef)
    
    // Find the button closest to center
    let closestButton: HTMLElement | null = null
    let closestDistance = Infinity
    let closestIndex = -1
    
    // Iterate through all buttons
    const allButtons = Array.from(container.children).filter(c => c.tagName === 'BUTTON') as HTMLElement[]
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i]
      const rect = button.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const buttonCenter = rect.top + rect.height / 2 - containerRect.top
      const distance = Math.abs(buttonCenter - centerY)
      
      if (distance < closestDistance) {
        closestDistance = distance
        closestButton = button
        const dataIndex = button.getAttribute('data-index')
        closestIndex = dataIndex !== null ? parseInt(dataIndex, 10) : -1
      }
    }
    
    if (closestButton && closestIndex >= 0 && closestIndex < items.length) {
      // Snap the closest button to center
      const buttonTop = closestButton.offsetTop
      const buttonHeight = closestButton.clientHeight
      // Calculate exact center position
      const targetScroll = buttonTop + (buttonHeight / 2) - (containerHeight / 2)
      // Ensure we can scroll to snap first and last items to center
      const maxScroll = container.scrollHeight - containerHeight
      const clampedScroll = Math.max(0, Math.min(targetScroll, maxScroll))
      container.scrollTo({ top: clampedScroll, behavior: 'smooth' })
      
      // Update value based on what's centered
      const itemValue = getItemValue(items[closestIndex])
      setValue(itemValue)
    }
  }

  // Center a specific item in a scroll container
  const centerItem = (scrollRef: React.RefObject<HTMLDivElement>, itemIndex: number) => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const buttons = Array.from(container.children).filter(c => c.tagName === 'BUTTON') as HTMLElement[]
    const button = buttons[itemIndex]
    if (button) {
      const containerHeight = container.clientHeight
      const buttonTop = button.offsetTop
      const buttonHeight = button.clientHeight
      // Calculate exact center position: button center - container center
      const targetScroll = buttonTop + (buttonHeight / 2) - (containerHeight / 2)
      const maxScroll = container.scrollHeight - containerHeight
      const clampedScroll = Math.max(0, Math.min(targetScroll, maxScroll))
      container.scrollTo({ top: clampedScroll, behavior: 'smooth' })
    }
  }

  const handleYearChange = (year: number, shouldCenter: boolean = true) => {
    setSelectedYear(year)
    
    // Center the selected year if requested (e.g., when clicking)
    if (shouldCenter) {
      const validYears = getValidYears()
      const yearIndex = validYears.indexOf(year)
      if (yearIndex >= 0) {
        centerItem(yearScrollRef, yearIndex)
      }
    }
    
    // Reset month and day if they become invalid
    const validMonths = getValidMonths()
    if (selectedMonth && !validMonths.includes(selectedMonth)) {
      setSelectedMonth(null)
      setSelectedDay(null)
    } else if (selectedMonth && selectedDay) {
      // Check if current day is still valid
      if (!isDateValid(year, selectedMonth, selectedDay)) {
        setSelectedDay(null)
      }
    }
  }

  const handleMonthChange = (month: number, shouldCenter: boolean = true) => {
    if (!selectedYear) {
      setSelectedMonth(month)
      return
    }
    
    // Check if the date is valid with current day, if not find nearest valid date
    if (selectedDay && !isDateValid(selectedYear, month, selectedDay)) {
      const validDate = findValidDateForMonth(month, selectedYear, selectedDay)
      if (validDate) {
        // Update year and day if needed
        if (validDate.year !== selectedYear) {
          setSelectedYear(validDate.year)
        }
        setSelectedMonth(validDate.month)
        setSelectedDay(validDate.day)
        
        // Center all affected wheels
        if (shouldCenter) {
          setTimeout(() => {
            const validYears = getValidYears()
            const validMonths = getValidMonths()
            const validDays = getDayOptions()
            if (validDate.year !== selectedYear) {
              const yearIndex = validYears.indexOf(validDate.year)
              if (yearIndex >= 0) centerItem(yearScrollRef, yearIndex)
            }
            const monthIndex = validMonths.indexOf(validDate.month)
            const dayIndex = validDays.indexOf(validDate.day)
            if (monthIndex >= 0) centerItem(monthScrollRef, monthIndex)
            if (dayIndex >= 0) centerItem(dayScrollRef, dayIndex)
          }, 50)
        }
        return
      }
    }
    
    setSelectedMonth(month)
    
    // Center the selected month if requested (e.g., when clicking)
    if (shouldCenter) {
      const validMonths = getValidMonths()
      const monthIndex = validMonths.indexOf(month)
      if (monthIndex >= 0) {
        centerItem(monthScrollRef, monthIndex)
      }
    }
    
    // Adjust day if it becomes invalid
    if (selectedYear && selectedDay) {
      const daysInMonth = new Date(selectedYear, month, 0).getDate()
      if (selectedDay > daysInMonth) {
        setSelectedDay(daysInMonth)
      } else if (!isDateValid(selectedYear, month, selectedDay)) {
        // Find the last valid day in this month
        for (let d = daysInMonth; d >= 1; d--) {
          if (isDateValid(selectedYear, month, d)) {
            setSelectedDay(d)
            break
          }
        }
      }
    }
  }

  // Find nearest valid date when day changes
  const findValidDateForDay = (day: number, currentYear: number | null, currentMonth: number | null): { year: number; month: number; day: number } | null => {
    if (!currentYear || !currentMonth) return null
    
    const validYears = getValidYears()
    if (!validYears.includes(currentYear)) return null
    
    // Try current year and month first
    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate()
    const validDayCurrent = Math.min(day, daysInCurrentMonth)
    if (isDateValid(currentYear, currentMonth, validDayCurrent)) {
      return { year: currentYear, month: currentMonth, day: validDayCurrent }
    }
    
    // Try previous month (e.g., Dec 1 -> scroll to 29 -> becomes Nov 29)
    let testMonth = currentMonth - 1
    let testYear = currentYear
    if (testMonth < 1) {
      testMonth = 12
      testYear = currentYear - 1
    }
    
    // Check if previous month/year is valid
    if (validYears.includes(testYear)) {
      const daysInPrevMonth = new Date(testYear, testMonth, 0).getDate()
      const validDay = Math.min(day, daysInPrevMonth)
      if (isDateValid(testYear, testMonth, validDay)) {
        return { year: testYear, month: testMonth, day: validDay }
      }
    }
    
    // Try next month
    testMonth = currentMonth + 1
    testYear = currentYear
    if (testMonth > 12) {
      testMonth = 1
      testYear = currentYear + 1
    }
    
    if (validYears.includes(testYear)) {
      const daysInNextMonth = new Date(testYear, testMonth, 0).getDate()
      const validDay = Math.min(day, daysInNextMonth)
      if (isDateValid(testYear, testMonth, validDay)) {
        return { year: testYear, month: testMonth, day: validDay }
      }
    }
    
    return null
  }

  // Find nearest valid date when month changes
  const findValidDateForMonth = (month: number, currentYear: number | null, currentDay: number | null): { year: number; month: number; day: number } | null => {
    if (!currentYear || !currentDay) return null
    
    // Try current year first
    const daysInMonth = new Date(currentYear, month, 0).getDate()
    const validDay = Math.min(currentDay, daysInMonth)
    if (isDateValid(currentYear, month, validDay)) {
      return { year: currentYear, month, day: validDay }
    }
    
    // Try previous year
    const validYears = getValidYears()
    const prevYearIndex = validYears.indexOf(currentYear) - 1
    if (prevYearIndex >= 0) {
      const prevYear = validYears[prevYearIndex]
      const daysInPrevYearMonth = new Date(prevYear, month, 0).getDate()
      const validDayPrev = Math.min(currentDay, daysInPrevYearMonth)
      if (isDateValid(prevYear, month, validDayPrev)) {
        return { year: prevYear, month, day: validDayPrev }
      }
    }
    
    // Try next year
    const nextYearIndex = validYears.indexOf(currentYear) + 1
    if (nextYearIndex < validYears.length) {
      const nextYear = validYears[nextYearIndex]
      const daysInNextYearMonth = new Date(nextYear, month, 0).getDate()
      const validDayNext = Math.min(currentDay, daysInNextYearMonth)
      if (isDateValid(nextYear, month, validDayNext)) {
        return { year: nextYear, month, day: validDayNext }
      }
    }
    
    return null
  }

  const handleDayChange = (day: number, shouldCenter: boolean = true) => {
    if (!selectedYear || !selectedMonth) {
      setSelectedDay(day)
      return
    }
    
    const daysInCurrentMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    const validDayForCurrentMonth = Math.min(day, daysInCurrentMonth)
    
    // Check if the day is valid for current month, if not find nearest valid date (adjust month/year)
    if (day > daysInCurrentMonth || !isDateValid(selectedYear, selectedMonth, validDayForCurrentMonth)) {
      const validDate = findValidDateForDay(day, selectedYear, selectedMonth)
      if (validDate) {
        // Update all three values
        setSelectedYear(validDate.year)
        setSelectedMonth(validDate.month)
        setSelectedDay(validDate.day)
        
        // Center all three wheels
        if (shouldCenter) {
          setTimeout(() => {
            const validYears = getValidYears()
            const validMonths = getValidMonths()
            const validDays = getDayOptions()
            const yearIndex = validYears.indexOf(validDate.year)
            const monthIndex = validMonths.indexOf(validDate.month)
            const dayIndex = validDays.indexOf(validDate.day)
            if (yearIndex >= 0) centerItem(yearScrollRef, yearIndex, validYears.length)
            if (monthIndex >= 0) centerItem(monthScrollRef, monthIndex, validMonths.length)
            if (dayIndex >= 0) centerItem(dayScrollRef, dayIndex, validDays.length)
          }, 50)
        }
        return
      }
    }
    
    // Day is valid for current month
    setSelectedDay(validDayForCurrentMonth)
    
    // Center the selected day if requested (e.g., when clicking)
    if (shouldCenter) {
      const validDays = getDayOptions()
      const dayIndex = validDays.indexOf(validDayForCurrentMonth)
      if (dayIndex >= 0) {
        centerItem(dayScrollRef, dayIndex)
      }
    }
  }

  // Format display value
  const getDisplayValue = () => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })
      }
    }
    return placeholder
  }

  // Handle date input change (desktop)
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value
    
    // Validate against min/max
    if (minDate && selectedDate < minDate) return
    if (maxDate && selectedDate > maxDate) return
    
    onChange?.(selectedDate)
  }

  // Handle confirm
  const handleConfirm = () => {
    if (selectedYear && selectedMonth && selectedDay) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
      onChange?.(dateStr)
      setIsOpen(false)
    }
  }

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false)
    }
  }

  const validYears = getValidYears()
  const validMonths = getValidMonths()
  // Recalculate day options when year or month changes
  const validDays = useMemo(() => getDayOptions(), [selectedYear, selectedMonth])

  // Initialize to closest date when picker opens (if no value)
  useEffect(() => {
    if (isOpen && !value && !selectedYear) {
      const closestDate = getClosestValidDate()
      if (closestDate) {
        setSelectedYear(closestDate.year)
        setSelectedMonth(closestDate.month)
        setSelectedDay(closestDate.day)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, value, selectedYear, minDate, maxDate])

  // Auto-scroll to selected values only when picker first opens (not when values change)
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // Center the selected values
        if (selectedYear && yearScrollRef.current) {
          const yearIndex = validYears.indexOf(selectedYear)
          if (yearIndex >= 0) {
            centerItem(yearScrollRef, yearIndex)
          }
        }
        if (selectedMonth && monthScrollRef.current) {
          const monthIndex = validMonths.indexOf(selectedMonth)
          if (monthIndex >= 0) {
            centerItem(monthScrollRef, monthIndex)
          }
        }
        if (selectedDay && dayScrollRef.current) {
          const dayIndex = validDays.indexOf(selectedDay)
          if (dayIndex >= 0) {
            centerItem(dayScrollRef, dayIndex)
          }
        }
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]) // Only trigger when picker opens, not when values change


  // Add scroll event listeners with debouncing and infinite scroll wrapping
  useEffect(() => {
    if (!isOpen) return

    let yearScrollTimeout: NodeJS.Timeout
    let monthScrollTimeout: NodeJS.Timeout
    let dayScrollTimeout: NodeJS.Timeout

    const yearScrollHandler = () => {
      // Apply blur immediately during scroll
      applyBlurToButtons(yearScrollRef)
      
      clearTimeout(yearScrollTimeout)
      yearScrollTimeout = setTimeout(() => {
        const validYears = getValidYears()
        snapToCenter(
          yearScrollRef,
          validYears,
          (year) => handleYearChange(year, false), // Don't center again, snapToCenter already did it
          (year) => year,
          48
        )
      }, 150)
    }

    const monthScrollHandler = () => {
      // Apply blur immediately during scroll
      applyBlurToButtons(monthScrollRef)
      
      clearTimeout(monthScrollTimeout)
      monthScrollTimeout = setTimeout(() => {
        const validMonths = getValidMonths()
        snapToCenter(
          monthScrollRef,
          validMonths,
          (month) => handleMonthChange(month, false), // Don't center again, snapToCenter already did it
          (month) => month,
          48
        )
      }, 150)
    }

    const dayScrollHandler = () => {
      // Apply blur immediately during scroll
      applyBlurToButtons(dayScrollRef)
      
      clearTimeout(dayScrollTimeout)
      dayScrollTimeout = setTimeout(() => {
        const validDays = getDayOptions()
        snapToCenter(
          dayScrollRef,
          validDays,
          (day) => handleDayChange(day, false), // Don't center again, snapToCenter already did it
          (day) => day,
          48
        )
      }, 150)
    }

    const yearContainer = yearScrollRef.current
    const monthContainer = monthScrollRef.current
    const dayContainer = dayScrollRef.current

    if (yearContainer) {
      yearContainer.addEventListener('scroll', yearScrollHandler, { passive: true })
    }
    if (monthContainer) {
      monthContainer.addEventListener('scroll', monthScrollHandler, { passive: true })
    }
    if (dayContainer) {
      dayContainer.addEventListener('scroll', dayScrollHandler, { passive: true })
    }

    return () => {
      clearTimeout(yearScrollTimeout)
      clearTimeout(monthScrollTimeout)
      clearTimeout(dayScrollTimeout)
      if (yearContainer) yearContainer.removeEventListener('scroll', yearScrollHandler)
      if (monthContainer) monthContainer.removeEventListener('scroll', monthScrollHandler)
      if (dayContainer) dayContainer.removeEventListener('scroll', dayScrollHandler)
    }
  }, [isOpen, selectedYear, selectedMonth]) // Include dependencies that affect valid options

  // Desktop: Simple date input (matching create-application-modal.tsx)
  if (!isMobile) {
    return (
      <Input
        type="date"
        value={value || ''}
        onChange={handleDateInputChange}
        disabled={disabled}
        min={minDate}
        max={maxDate}
        className={cn(
          "w-full text-xs",
          !value && "text-gray-500",
          className
        )}
      />
    )
  }

  // Mobile: Wheel picker
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full h-10 px-3 text-left text-xs border rounded-md bg-white",
          "flex items-center justify-between",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-gray-400",
          !value && "text-gray-500"
        )}
      >
        <span>{getDisplayValue()}</span>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={handleBackdropClick}
        >
          <div 
            className="bg-white border rounded-lg shadow-xl p-3 w-full max-w-[300px]"
            onClick={(e) => e.stopPropagation()}
          >
            {label && (
              <div className="text-sm font-semibold text-gray-800 mb-3 text-center border-b pb-2">
                {label}
              </div>
            )}
            <div className="flex gap-1 mb-3 relative min-w-0">
              {/* Year Wheel */}
              <div className="flex-1 relative min-w-0">
              <div className="text-xs font-semibold text-gray-700 mb-1 text-center">Year</div>
              <div className="relative h-40 border rounded-lg overflow-hidden bg-gray-50">
                <div 
                  ref={yearScrollRef}
                  className="relative h-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth z-30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  style={{ 
                    touchAction: 'pan-y'
                  }}
                >
                <div style={{ height: 'calc(50% - 1.5rem)', minHeight: 'calc(50% - 1.5rem)' }} />
                {validYears.map((year, index) => (
                  <button
                    key={`year-${year}-${index}`}
                    type="button"
                    data-index={index}
                    onClick={() => handleYearChange(year)}
                    className={cn(
                      "w-full py-3 text-sm text-center snap-center transition-all whitespace-nowrap overflow-hidden",
                      "hover:opacity-80 active:opacity-70",
                      selectedYear === year 
                        ? "font-bold text-blue-700" 
                        : "text-gray-700"
                    )}
                  >
                    {year}
                  </button>
                ))}
                <div style={{ height: 'calc(50% - 1.5rem)', minHeight: 'calc(50% - 1.5rem)' }} />
                </div>
                {/* Selection highlight overlay - centered */}
                <div 
                  className="absolute left-0 right-0 h-12 bg-blue-100/60 border-y-2 border-blue-400 pointer-events-none z-40"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />
                {/* Top fade gradient */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white via-white to-transparent pointer-events-none z-20" />
                {/* Bottom fade gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white to-transparent pointer-events-none z-20" />
              </div>
            </div>

            {/* Month Wheel */}
            <div className="flex-1 relative min-w-0">
              <div className="text-xs font-semibold text-gray-700 mb-1 text-center">Month</div>
              <div className="relative h-40 border rounded-lg overflow-hidden bg-gray-50">
                <div 
                  ref={monthScrollRef}
                  className="relative h-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth z-30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  style={{ 
                    touchAction: 'pan-y'
                  }}
                >
                <div style={{ height: 'calc(50% - 1.5rem)', minHeight: 'calc(50% - 1.5rem)' }} />
                {validMonths.map((month, index) => (
                  <button
                    key={`month-${month}-${index}`}
                    type="button"
                    data-index={index}
                    onClick={() => handleMonthChange(month)}
                    disabled={!selectedYear}
                    className={cn(
                      "w-full py-3 text-sm text-center snap-center transition-all whitespace-nowrap overflow-hidden",
                      "hover:opacity-80 active:opacity-70",
                      selectedMonth === month 
                        ? "font-bold text-blue-700" 
                        : "text-gray-700",
                      !selectedYear && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'short' })}
                  </button>
                ))}
                <div style={{ height: 'calc(50% - 1.5rem)', minHeight: 'calc(50% - 1.5rem)' }} />
                </div>
                {/* Selection highlight overlay - centered */}
                <div 
                  className="absolute left-0 right-0 h-12 bg-blue-100/60 border-y-2 border-blue-400 pointer-events-none z-40"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />
                {/* Top fade gradient */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white via-white to-transparent pointer-events-none z-20" />
                {/* Bottom fade gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white to-transparent pointer-events-none z-20" />
              </div>
            </div>

            {/* Day Wheel */}
            <div className="flex-1 relative min-w-0">
              <div className="text-xs font-semibold text-gray-700 mb-1 text-center">Day</div>
              <div className="relative h-40 border rounded-lg overflow-hidden bg-gray-50">
                <div 
                  ref={dayScrollRef}
                  className="relative h-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth z-30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  style={{ 
                    touchAction: 'pan-y'
                  }}
                >
                {validDays.length > 0 ? (
                  <>
                  <div style={{ height: 'calc(50% - 1.5rem)', minHeight: 'calc(50% - 1.5rem)' }} />
                  {validDays.map((day, index) => (
                    <button
                      key={`day-${day}-${index}`}
                      type="button"
                      data-index={index}
                      onClick={() => handleDayChange(day)}
                      disabled={!selectedYear || !selectedMonth}
                      className={cn(
                        "w-full py-3 text-sm text-center snap-center transition-all whitespace-nowrap overflow-hidden",
                        "hover:opacity-80 active:opacity-70",
                        selectedDay === day 
                          ? "font-bold text-blue-700" 
                          : "text-gray-700",
                        (!selectedYear || !selectedMonth) && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                  <div style={{ height: 'calc(50% - 1.5rem)', minHeight: 'calc(50% - 1.5rem)' }} />
                  </>
                ) : (
                  <div className="w-full py-8 text-xs text-center text-gray-400">
                    Select month first
                  </div>
                )}
                </div>
                {/* Selection highlight overlay - centered */}
                <div 
                  className="absolute left-0 right-0 h-12 bg-blue-100/60 border-y-2 border-blue-400 pointer-events-none z-40"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />
                {/* Top fade gradient */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white via-white to-transparent pointer-events-none z-20" />
                {/* Bottom fade gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white to-transparent pointer-events-none z-20" />
              </div>
            </div>
          </div>

            <div className="flex gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedYear || !selectedMonth || !selectedDay}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-md",
                  "hover:bg-blue-700 active:bg-blue-800 transition-colors",
                  (!selectedYear || !selectedMonth || !selectedDay) && "opacity-50 cursor-not-allowed"
                )}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

