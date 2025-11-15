# Icon Requirements for Path Pal

Complete list of all icons needed to replace emojis throughout the application.

## Icon List

### Navigation & UI
1. **Menu/Hamburger** (☰) - Mobile menu toggle button
   - Used in: All pages (header menu toggle)
   - Suggested: Hamburger icon (3 horizontal lines)

2. **Mobile Device** (📱) - Mobile app required message
   - Used in: Desktop message on all pages
   - Suggested: Phone/mobile device icon

### Quick Access Tiles (Home Page)
3. **Chart/Analytics** (📊) - Check Your Odds
   - Used in: index.html (quick access tile)
   - Suggested: Bar chart or analytics icon

4. **Search/Magnifying Glass** (🔍) - Explore Colleges
   - Used in: index.html (quick access tile)
   - Suggested: Magnifying glass/search icon

5. **Calendar** (📅) - Plan Your Path / Add to Planner
   - Used in: index.html (quick access tile), activities.html (Add to Planner button)
   - Suggested: Calendar icon

6. **Chat/Message Bubble** (💬) - AI Chat Advisor
   - Used in: index.html (quick access tile)
   - Suggested: Chat bubble or message icon

7. **User/Profile** (👤) - My Profile
   - Used in: index.html (quick access tile), profile.html (profile avatar placeholder)
   - Suggested: User/person icon

8. **Star** (⭐) - Saved Colleges / Save button
   - Used in: index.html (quick access tile), explorer.html (Save button), activities.html (Save button)
   - Suggested: Star icon (outline when not saved, filled when saved)

9. **Checkmark** (✓) - Saved state indicator
   - Used in: explorer.html (Saved button text), activities.html (Saved button text)
   - Suggested: Checkmark icon

### Location & Content
10. **Location Pin** (📍) - College location
    - Used in: explorer.html, saved.html (college location)
    - Suggested: Location pin/map marker icon

### Quick Questions (Messages Page)
11. **Book/Document** (📚) - Course Recommendations
    - Used in: messages.html (quick question button)
    - Suggested: Book or document icon

12. **Running Person** (🏃) - Activity Suggestions
    - Used in: messages.html (quick question button)
    - Suggested: Running person or activity icon

13. **Document/Note** (📝) - Application Prep
    - Used in: messages.html (quick question button)
    - Suggested: Document or clipboard icon

### Status Indicators (Simulator)
14. **Up Arrow** (↑) - Increase/improvement
    - Used in: simulator.html (odds change indicator)
    - Suggested: Up arrow icon

15. **Down Arrow** (↓) - Decrease/decline
    - Used in: simulator.html (odds change indicator)
    - Suggested: Down arrow icon

16. **Equals** (=) - No change
    - Used in: simulator.html (odds change indicator)
    - Suggested: Equals icon

### Navigation Arrows
17. **Right Arrow** (→) - "View Now" link
    - Used in: index.html (notification link)
    - Suggested: Right arrow or chevron icon

## Icon Format Recommendations

### File Format
- **SVG** (preferred) - Scalable, lightweight, supports colors
- **PNG** (fallback) - 24x24, 32x32, 48x48 sizes for different contexts

### Color Scheme
- Primary: `#0d8c79` (main green)
- Secondary: `#2c3e50` (dark text)
- Light: `#7f8c8d` (light text)
- White: `#ffffff` (for backgrounds)

### Icon Library Recommendations
- **Font Awesome** - Comprehensive, easy to use
- **Material Icons** - Clean, modern design
- **Heroicons** - Simple, beautiful
- **Feather Icons** - Lightweight, minimal
- **Bootstrap Icons** - Free, extensive collection

## Implementation Options

### Option 1: Icon Font (Recommended)
Use an icon font like Font Awesome:
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<i class="fas fa-chart-bar"></i> <!-- instead of 📊 -->
```

### Option 2: SVG Icons
Include SVG icons inline or as files:
```html
<img src="/icons/chart.svg" alt="Chart" class="icon">
```

### Option 3: Icon Library (Custom)
Create a custom icon font or sprite sheet with only the icons you need.

## Priority Icons (Must Have)
1. Menu/Hamburger (☰)
2. Mobile Device (📱)
3. Star (⭐)
4. Checkmark (✓)
5. Location Pin (📍)
6. Chart/Analytics (📊)
7. Search (🔍)
8. Calendar (📅)
9. Chat (💬)
10. User/Profile (👤)

## Secondary Icons (Nice to Have)
11. Book (📚)
12. Running Person (🏃)
13. Document (📝)
14. Up/Down/Equals Arrows (↑↓=)
15. Right Arrow (→)

## Icon Sizes Needed
- **24x24px** - Buttons, inline content
- **32x32px** - Quick access tiles (tile-icon)
- **48x48px** - Profile avatar placeholder
- **64x64px** - Larger display contexts

## File Structure Suggestion
```
media/
  icons/
    menu.svg (or menu-24.png, menu-32.png, etc.)
    mobile.svg
    chart.svg
    search.svg
    calendar.svg
    chat.svg
    user.svg
    star.svg
    star-filled.svg
    checkmark.svg
    location.svg
    book.svg
    running.svg
    document.svg
    arrow-up.svg
    arrow-down.svg
    arrow-right.svg
    equals.svg
```

