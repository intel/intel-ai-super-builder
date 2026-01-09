# MCP Marketplace Component

## Overview

The `McpMarketPlace.jsx` component provides an app store-like interface for browsing and managing MCP (Model Context Protocol) server modules. It integrates with ModelScope's MCP Server Marketplace API to fetch and display available MCP servers with intelligent caching, search functionality, and unique server naming to prevent conflicts.

## Features

### 1. **App Store Interface**

- Grid layout with cards displaying MCP modules (300x200px cards)
- Each card shows:
  - Icon (logo image or emoji fallback)
  - Name (with Chinese name support)
  - Publisher information
  - Description (cleaned of Markdown/badges, truncated to 3 lines)
  - View count
  - Keywords/tags (up to 3 shown, with +N indicator)
  - Install/Uninstall button
- Responsive grid that adjusts to window size
- Hover effects with elevation and transform

### 2. **Smart Search Functionality** ✨ NEW

- Real-time search filter (600px wide search bar)
- Searches across multiple fields:
  - Item name (English and Chinese)
  - Description (English and Chinese)
  - Publisher name
  - Keywords and categories
- Case-insensitive matching
- Shows result count when searching ("Showing X of Y items")
- Clear search button in empty state
- Search icon indicators

### 3. **Intelligent Caching System** ✨ NEW

- **10-minute cache** for marketplace data (configurable via `setMarketplaceCacheTimeout()`)
- Automatic cache invalidation when:
  - Filters or search terms change
  - User navigates to different pages
  - Force refresh is triggered
- Cache bypass with refresh button (passes `forceRefresh: true`)
- Shows cache timestamp in console logs
- Automatic installed status updates even with cached data
- Significantly reduces API calls and improves performance

### 4. **Unique Server Naming** ✨ NEW

- **Format**: `{serverName}_{marketplaceItemId}` (e.g., `fetch_12345`)
- Prevents conflicts when installing the same server type from different marketplace items
- Consistent naming across install/uninstall/check operations
- Helper functions:
  - `generateMcpServerName(serverName, marketplaceItemId)`
  - `isServerFromMarketplaceItem(localServerName, marketplaceServerName, marketplaceItemId)`

### 5. **Installation Management**

- **Install Button**: Adds MCP servers to your configuration
  - Fetches detailed server configuration by marketplace item ID
  - Handles multiple servers per marketplace item (e.g., "fetch" + "filesystem")
  - Generates unique server names automatically
  - Shows success notification with unique server name
- **Uninstall Button**: Removes MCP servers (only shown for installed servers)
  - Batch uninstalls all servers belonging to a marketplace item
  - Checks for running servers before uninstalling
  - Displays detailed messages (e.g., "Successfully uninstalled 'Item' (2 servers)")
  - Lists running servers if uninstall is blocked
- **Status Indicators**:
  - "Installed" badge for already installed servers (green)
  - Card-level loading spinner during install/uninstall (not full-page blocking)
  - Disabled state when server is running (can't uninstall)
  - Processing state managed per card, not globally

### 6. **Refresh Functionality**

- Refresh button in the header with force bypass cache
- Reloads both marketplace items and installed servers
- Updates installed status for all marketplace items
- Shows loading state during refresh

### 7. **Enhanced UI/UX** ✨ NEW

- **Description Cleaning**: Automatically removes Markdown syntax, badge links, and extra markup
- **Text Overflow**: Proper 3-line truncation with ellipsis
- **Button Styling**: Red outlined button for uninstall, blue filled for install
- **Empty States**:
  - "No results found" with clear search button
  - "No marketplace items available" when empty
- **Result Count**: Shows filtered vs total items when searching

### 8. **ModelScope Integration**

- Fetches MCP servers from ModelScope's official marketplace API
- Fetches detailed server configurations by ID for installation
- Displays ModelScope logo in the header
- Supports pagination, filtering by category, and search functionality
- Backend Tauri command handles API requests to avoid CORS issues
- Parses nested `mcpServers` object structure correctly

## Integration Guide

### Step 1: Import the Component

```jsx
import McpMarketPlace from './components/mcpManagement/McpMarketPlace';
```

### Step 2: Add to Your Navigation

You can integrate the marketplace into your existing MCP Management system. Here's an example of adding a tab or button to access it:

```jsx
// In McpManagement.jsx or your main navigation
import McpMarketPlace from './McpMarketPlace';

const [currentView, setCurrentView] = useState('servers'); // "servers" | "marketplace"

// Add a button to switch views
<Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
  <Button
    variant={currentView === 'servers' ? 'contained' : 'outlined'}
    onClick={() => setCurrentView('servers')}
  >
    My Servers
  </Button>
  <Button
    variant={currentView === 'marketplace' ? 'contained' : 'outlined'}
    onClick={() => setCurrentView('marketplace')}
  >
    Marketplace
  </Button>
</Box>;

// Conditionally render the view
{
  currentView === 'marketplace' ? (
    <McpMarketPlace />
  ) : (
    <>
      <McpAgentTable />
      <McpServerTable />
    </>
  );
}
```

### Step 3: Update Translation Files (Optional)

Add the following translation keys to your i18n files:

```json
{
  "mcp": {
    "marketplace": {
      "title": "MCP Marketplace",
      "refresh": "Refresh Marketplace",
      "loading": "Loading marketplace items...",
      "install": "Install",
      "uninstall": "Uninstall",
      "installing": "Installing...",
      "uninstalling": "Uninstalling...",
      "installed": "Installed",
      "running": "Running",
      "empty": "No marketplace items available"
    }
  }
}
```

### Step 4: Backend Integration (Already Implemented)

The marketplace is already integrated with ModelScope's API through a Tauri backend command. The implementation includes:

**Frontend (McpStore.jsx)**:

```jsx
const getMarketplaceServers = async (
  pageNumber = 1,
  pageSize = 100,
  category = '',
  search = ''
) => {
  try {
    set({ marketplaceLoading: true });

    const response = await invoke('fetch_modelscope_mcp_servers', {
      pageNumber: pageNumber,
      pageSize: pageSize,
      category: category,
      search: search,
    });

    const result = JSON.parse(response);
    const transformedServers =
      result.data?.mcp_server_list?.map(server => ({
        id: server.id,
        name: server.locales?.en?.name || server.name,
        chineseName: server.chinese_name || server.locales?.zh?.name,
        description: server.locales?.en?.description || server.description,
        keywords: [...(server.categories || []), ...(server.tags || [])],
        icon: server.logo_url || '📦',
        publisher: server.publisher,
        viewCount: server.view_count,
        categories: server.categories || [],
      })) || [];

    set({ marketplaceServers: transformedServers });
  } catch (error) {
    console.error('Failed to fetch MCP Marketplace Servers:', error);
  } finally {
    set({ marketplaceLoading: false });
  }
};
```

**Backend (lib.rs)**:

```rust
#[tauri::command]
async fn fetch_modelscope_mcp_servers(
    page_number: u32,
    page_size: u32,
    category: String,
    search: String
) -> Result<String, String> {
    let url = "https://www.modelscope.cn/openapi/v1/mcp/servers";

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .put(url)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .header("User-Agent", "IntelAIA/2.7.0")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    Ok(text)
}
```

## API Requirements

### ModelScope MCP Server API

The component integrates with ModelScope's official MCP Server Marketplace API:

**Endpoint**: `https://www.modelscope.cn/openapi/v1/mcp/servers`  
**Method**: `PUT`  
**Request Body**:

```json
{
  "direction": 1,
  "filter": {
    "is_hosted": true,
    "category": "optional-category"
  },
  "page_number": 1,
  "page_size": 20,
  "search": ""
}
```

**Response Format**:

```typescript
interface ModelScopeResponse {
  data: {
    total_count: number;
    mcp_server_list: Array<{
      id: string;
      name: string;
      chinese_name: string;
      description: string; // May contain Markdown syntax
      locales: {
        en: { name: string; description: string };
        zh: { name: string; description: string };
      };
      categories: string[];
      tags: string[];
      keywords: string[]; // Used for search filtering
      logo_url: string;
      publisher: string;
      view_count: number;
    }>;
  };
}
```

### Server Detail API (By ID)

For fetching individual server configuration during installation:

**Endpoint**: `https://www.modelscope.cn/api/v1/mcp/servers/{server_id}`  
**Method**: `GET`  
**Response Format**:

```typescript
interface ServerDetailResponse {
  Data: {
    Id: string;
    Name: string;
    mcpServers: {
      [serverName: string]: {
        command: string;
        args: string[];
        env: Record<string, string>;
      };
    };
  };
}
```

**Important Notes**:

- The `mcpServers` field is an **object** (not array)
- Keys are the actual MCP server names (e.g., "fetch", "sqlite")
- When installed locally, servers are renamed to `{serverName}_{marketplaceItemId}` for uniqueness
- Example: Server "fetch" from item "12345" becomes "fetch_12345"

````

**Transformed Internal Format**:
```typescript
interface MarketplaceItem {
  id: string;                    // Unique identifier
  name: string;                  // Display name (English)
  chineseName: string;           // Chinese name
  description: string;           // Short description (English)
  chineseDescription: string;    // Chinese description
  keywords: string[];            // Combined categories and tags
  icon: string;                  // Logo URL or emoji fallback
  publisher: string;             // Publisher name
  viewCount: number;             // View count
  categories: string[];          // Categories
  command: string;               // Command to run (populated on install)
  args: string;                  // Command arguments (populated on install)
  url: string;                   // Server URL (populated on install)
  env: string;                   // Environment variables (populated on install)
}
````

## Methods Used from McpStore

The component uses the following methods from `useMcpStore`:

### Core Marketplace Methods

- `getMarketplaceServers(forceRefresh = false)` - Fetch marketplace servers with 10-minute cache ✨ NEW
- `getModelScopeMcpServerById(serverId)` - Fetch detailed server configuration by ID ✨ IMPROVED
- `getLocalMcpServers()` - Fetch installed local servers (renamed from getMcpServer) ✨ RENAMED
- `generateMcpServerName(serverName, marketplaceItemId)` - Generate unique server name ✨ NEW
- `checkMarketplaceItemInstalled(marketplaceItemId)` - Check if marketplace item is installed ✨ NEW
- `updateMarketplaceInstalledStatus()` - Update installed flags for all marketplace items ✨ NEW
- `setMarketplaceCacheTimeout(minutes)` - Configure cache timeout (default: 10 mins) ✨ NEW

### Server Management Methods

- `addMcpServer()` - Install a new server
- `removeMcpServer()` - Uninstall a server
- `setMcpInput()` - Set server configuration
- `setSelectedMcpServer()` - Set selected server for operations
- `setSelectedMcpServerId()` - Set selected server ID

### State Variables

- `marketplaceServers` - Array of marketplace items with `isInstalled` flag ✨ UPDATED
- `marketplaceServersById` - Object cache indexed by marketplace ID ✨ NEW
- `marketplaceLoading` - Loading state for API requests
- `marketplaceTotalPages` - Total number of pages available
- `marketplaceLastFetch` - Timestamp of last successful fetch ✨ NEW
- `marketplaceCacheTimeout` - Cache timeout in milliseconds (default: 600000ms = 10 mins) ✨ NEW
- `mcpServers` - Array of installed local MCP servers
- `mcpServersConfig` - Cached configuration object from file ✨ NEW
- `marketplaceCurrentPage` - Current page number

## Styling

The component uses Material-UI components and custom CSS from `McpMarketPlace.css`. Key features:

- Responsive grid layout (1-4 columns depending on screen size)
- Hover effects on cards
- Visual indicators for installed servers
- Loading states and spinners
- Empty state display

## Customization

### Changing Grid Layout

Modify the Grid `item` props in the JSX:

```jsx
<Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
```

- `xs={12}`: Full width on extra small screens
- `sm={6}`: 2 columns on small screens
- `md={4}`: 3 columns on medium screens
- `lg={3}`: 4 columns on large screens

### Custom Icons

Replace emoji icons with Material-UI icons or images:

```jsx
// In the mock data or API response
{
  icon: <StorageIcon />,  // Material-UI icon
  // or
  icon: "https://example.com/icon.png"  // Image URL
}

// In the Card render:
<Typography className="card-icon">
  {typeof item.icon === 'string' ? item.icon : item.icon}
</Typography>
```

## Technical Implementation Details

### Why Use Tauri Backend Command?

The marketplace uses a Tauri backend command (`fetch_modelscope_mcp_servers`) instead of direct browser fetch because:

1. **CORS Issues**: Browser-based requests to ModelScope API are blocked by CORS policy
2. **Security**: Backend can add proper headers and handle authentication
3. **Performance**: Async Rust implementation using `reqwest` crate
4. **Reliability**: Better error handling and timeout management (30s timeout)

### Caching Strategy ✨ NEW

The marketplace implements intelligent caching to reduce API calls and improve performance:

**Cache Behavior**:

- Default cache timeout: **10 minutes** (configurable via `setMarketplaceCacheTimeout()`)
- Cache stores both list data and individual server details
- Automatic cache invalidation after timeout
- Manual refresh available via "Refresh" button (`forceRefresh=true`)

**Cache Structure**:

```javascript
{
  marketplaceServers: [...],              // Array of marketplace items
  marketplaceServersById: {               // Object cache for details
    "12345": { /* server config */ }
  },
  marketplaceLastFetch: 1704096000000,    // Timestamp
  marketplaceCacheTimeout: 600000         // 10 minutes in ms
}
```

**Cache Invalidation**:

- Automatic after configured timeout
- Manual via refresh button
- On successful install/uninstall operations (updates installed status only)

### Unique Server Naming ✨ NEW

To prevent conflicts when installing the same server from multiple marketplace items:

**Format**: `{serverName}_{marketplaceItemId}`

**Example**:

- Marketplace item "12345" contains server "fetch"
- Installed name: `fetch_12345`
- Another item "67890" also has "fetch"
- Installed name: `fetch_67890`

**Helper Method**:

```javascript
generateMcpServerName(serverName, marketplaceItemId) {
  return `${serverName}_${marketplaceItemId}`;
}
```

**Benefits**:

- No naming conflicts between different marketplace items
- Easy to trace which marketplace item a server came from
- Enables multiple versions/variants of the same server

### Async Implementation

The backend command is implemented as an async function to work within Tauri's async runtime:

- Uses `reqwest::Client` (async version, NOT `reqwest::blocking::Client`)
- This avoids runtime conflicts and crashes
- Properly integrated with Tokio runtime used by Tauri

### Dependencies Required

**Cargo.toml**:

```toml
reqwest = { version = "0.11", features = ["json"] }
serde_json = "1"
```

## Troubleshooting

### Servers Not Installing

1. **Check Server Configuration**: Verify marketplace item has valid `mcpServers` object
2. **Parse mcpServers Correctly**: Ensure using `Object.entries()` to iterate the object
3. **Unique Naming**: Verify `generateMcpServerName()` generates proper names like `fetch_12345`
4. **Check Console Logs**: Look for "Installing server..." and "Successfully added" messages
5. **Verify addMcpServer**: Ensure McpStore method receives correct config

Example correct parsing:

```javascript
Object.entries(serverInfo.mcpServers).forEach(([serverName, config]) => {
  const uniqueName = generateMcpServerName(serverName, serverId);
  // Install with uniqueName...
});
```

### Can't Uninstall a Server

**Common Issues**:

- Servers cannot be uninstalled while running - **stop the server first**
- Multiple servers from same marketplace item - all must be stopped before uninstall
- Check console for "Server is currently running" message

**Proper Uninstall Flow**:

1. Stop all running servers associated with the marketplace item
2. Click "Uninstall" button (should be red outlined)
3. Confirm operation
4. Verify removal in local servers list

### Installed Status Not Showing

1. **Check Cache**: Ensure `mcpServersConfig` is loaded properly
2. **Verify Naming**: Confirm installed servers use `{serverName}_{itemId}` format
3. **Force Refresh**: Click refresh button to reload marketplace
4. **Check Helper Method**: Verify `checkMarketplaceItemInstalled()` logic

### Marketplace Not Loading

1. **Check Console Logs**: Look for frontend logs with 🚀 and 📦 emojis
2. **Verify Backend**: Ensure Tauri command `fetch_modelscope_mcp_servers` is registered
3. **Network Issues**: Check if ModelScope API is accessible
4. **CORS Errors**: Should not occur with backend proxy, but verify requests go through Tauri
5. **Timeout**: Default 30s timeout; check if API responds within this time
6. **Cache Issues**: Try force refresh or wait for cache timeout (10 mins)

### Search Not Working

1. **Check Fields**: Search looks in name, chineseName, description, chineseDescription, publisher, keywords
2. **Case Sensitivity**: Search is case-insensitive
3. **Empty Results**: Verify marketplace has items matching search query
4. **Clear Search**: Click the X button or backspace to clear

### Description Overflow or Markdown Visible

If descriptions show Markdown syntax or overflow:

1. **Check CSS**: Verify `.card-description` has `overflow: hidden` and `line-clamp: 3`
2. **Verify Regex**: Description cleaning should remove `![...](...)` and `[...](...)` patterns
3. **Update Component**: Ensure latest version with description cleaning logic

### App Crashes on Marketplace Open

If the app crashes with "Cannot drop a runtime in a context where blocking is not allowed":

- Ensure using async `reqwest::Client` (not `blocking::Client`)
- Verify function is declared as `async fn`
- Check that `.await` is used after `.send()` and `.text()` calls

## Testing

### Testing the Backend Command

You can test the ModelScope API using curl:

**Windows PowerShell**:

```powershell
curl https://www.modelscope.cn/openapi/v1/mcp/servers `
  --request PUT `
  --header "Content-Type: application/json" `
  --data '{\"direction\":1,\"filter\":{\"is_hosted\":true},\"page_number\":1,\"page_size\":20,\"search\":\"\"}'
```

**Windows Batch**:

```batch
curl https://www.modelscope.cn/openapi/v1/mcp/servers ^
  --request PUT ^
  --header "Content-Type: application/json" ^
  --data "{\"direction\":1,\"filter\":{\"is_hosted\":true},\"page_number\":1,\"page_size\":20,\"search\":\"\"}"
```

## Known Limitations

1. **Installation Details**: Server command/args/url are not provided by ModelScope API
   - These fields need to be populated during installation
   - User may need to configure these manually
2. **No Version Information**: Current API doesn't provide version info
3. **Limited Metadata**: Some fields like dependencies, requirements not available

## Future Enhancements

Potential improvements:

1. **Pagination UI**: Add page navigation controls (currently loads page 1 with 100 items)
2. **Category Filtering**: Add dropdown for category-based filtering
3. **Detailed View**: Modal with full server details, documentation, and changelog
4. **Installation Wizard**: Guide users through server configuration if manual setup needed
5. **Ratings and Reviews**: Add user ratings and reviews integration
6. **Version Management**: Show and manage server versions if API provides this data
7. **Dependency Detection**: Automatically check and install required dependencies
8. **Batch Operations**: Install/uninstall multiple servers at once
9. **Export/Import**: Share server configurations between users
10. **Update Notifications**: Notify when installed servers have updates available

## Version History

### v2.3.0 (Latest) ✨ NEW

**Enhanced User Experience & Performance**

- ✅ **Smart Search**: Real-time search across name, description, publisher, and keywords (600px width)
- ✅ **Intelligent Caching**: 10-minute configurable cache to reduce API calls
- ✅ **Unique Server Naming**: Format `{serverName}_{marketplaceItemId}` prevents conflicts
- ✅ **Enhanced Installation**: Automatic installed status detection with cache
- ✅ **Improved Uninstall**: Handles multiple servers per marketplace item
- ✅ **Description Cleaning**: Removes Markdown syntax and badges from display
- ✅ **Better Loading UX**: Card-level loading instead of full-page blocking
- ✅ **CSS Overflow Fix**: Proper 3-line truncation with ellipsis
- ✅ **Function Renaming**: Renamed `getMcpServer()` → `getLocalMcpServers()`

### v2.2.0

**Bug Fixes & Stability**

- Fixed JSON parsing with `Object.entries()` for `mcpServers` object structure
- Fixed ReferenceError: "servers is not defined" → "serverinfo"
- Added comprehensive console logging for debugging
- Fixed button styling issues

### v2.1.0

**Initial ModelScope Integration**

- Added backend Tauri command for API access
- Implemented pagination support
- Added ModelScope logo and branding
- Fixed async/blocking runtime conflicts
