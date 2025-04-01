#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Type definitions for tool arguments
interface ListChannelsArgs {
  limit?: number;
  cursor?: string;
  types?: string;
}

interface FindChannelsByNameArgs {
  names: string[];
  types?: string;  // Changed from include_private to types
}

interface PostMessageArgs {
  channel_id: string;
  text: string;
}

interface ReplyToThreadArgs {
  channel_id: string;
  thread_ts: string;
  text: string;
}

interface AddReactionArgs {
  channel_id: string;
  timestamp: string;
  reaction: string;
}

interface GetChannelHistoryArgs {
  channel_id: string;
  limit?: number;
}

interface GetThreadRepliesArgs {
  channel_id: string;
  thread_ts: string;
}

interface GetUsersArgs {
  cursor?: string;
  limit?: number;
}

interface GetUserProfileArgs {
  user_id: string;
}

interface FindUsersByNameArgs {
  query: string;
  limit?: number;
}

interface FindUsersByEmailArgs {
  email: string;
}

interface FindUsersByAttributeArgs {
  attribute: string;
  value: string;
  limit?: number;
}

interface ScheduleMessageArgs {
  channel_id: string;
  text: string;
  post_at: number; // Unix timestamp for when to post the message
}

// Tool definitions
const listChannelsTool: Tool = {
  name: "slack_list_channels",
  description: "List public and private channels in the workspace with pagination",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description:
          "Maximum number of channels to return (default 100, max 200)",
        default: 100,
      },
      cursor: {
        type: "string",
        description: "Pagination cursor for next page of results",
      },
      types: {
        type: "string",
        description: "Comma-separated list of channel types to include: public_channel,private_channel",
        default: "public_channel",
      },
    },
  },
};

const findChannelsByNameTool: Tool = {
  name: "slack_find_channels_by_name",
  description: "Find channel IDs by their names, processing multiple channels in a single request",
  inputSchema: {
    type: "object",
    properties: {
      names: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Array of channel names to find (without the # symbol)",
      },
      types: {
        type: "string",
        description: "Comma-separated list of channel types to include: public_channel,private_channel,mpim,im",
        default: "public_channel",
      }
    },
    required: ["names"],
  },
};

const postMessageTool: Tool = {
  name: "slack_post_message",
  description: "Post a new message to a Slack channel",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel to post to",
      },
      text: {
        type: "string",
        description: "The message text to post",
      },
    },
    required: ["channel_id", "text"],
  },
};

const replyToThreadTool: Tool = {
  name: "slack_reply_to_thread",
  description: "Reply to a specific message thread in Slack",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the thread",
      },
      thread_ts: {
        type: "string",
        description: "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it.",
      },
      text: {
        type: "string",
        description: "The reply text",
      },
    },
    required: ["channel_id", "thread_ts", "text"],
  },
};

const addReactionTool: Tool = {
  name: "slack_add_reaction",
  description: "Add a reaction emoji to a message",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the message",
      },
      timestamp: {
        type: "string",
        description: "The timestamp of the message to react to",
      },
      reaction: {
        type: "string",
        description: "The name of the emoji reaction (without ::)",
      },
    },
    required: ["channel_id", "timestamp", "reaction"],
  },
};

const getChannelHistoryTool: Tool = {
  name: "slack_get_channel_history",
  description: "Get recent messages from a channel",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel",
      },
      limit: {
        type: "number",
        description: "Number of messages to retrieve (default 10)",
        default: 10,
      },
    },
    required: ["channel_id"],
  },
};

const getThreadRepliesTool: Tool = {
  name: "slack_get_thread_replies",
  description: "Get all replies in a message thread",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the thread",
      },
      thread_ts: {
        type: "string",
        description: "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it.",
      },
    },
    required: ["channel_id", "thread_ts"],
  },
};

const getUsersTool: Tool = {
  name: "slack_get_users",
  description:
    "Get a list of all users in the workspace with their basic profile information",
  inputSchema: {
    type: "object",
    properties: {
      cursor: {
        type: "string",
        description: "Pagination cursor for next page of results",
      },
      limit: {
        type: "number",
        description: "Maximum number of users to return (default 100, max 200)",
        default: 100,
      },
    },
  },
};

const getUserProfileTool: Tool = {
  name: "slack_get_user_profile",
  description: "Get detailed profile information for a specific user",
  inputSchema: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description: "The ID of the user",
      },
    },
    required: ["user_id"],
  },
};

const findUsersByNameTool: Tool = {
  name: "slack_find_users_by_name",
  description: "Find users by their display name or real name",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The name or partial name to search for (case insensitive)",
      },
      limit: {
        type: "number",
        description: "Maximum number of matching users to return",
        default: 10,
      },
    },
    required: ["query"],
  },
};

const findUsersByEmailTool: Tool = {
  name: "slack_find_users_by_email",
  description: "Find a user by their email address",
  inputSchema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "The email address to search for (exact match)",
      },
    },
    required: ["email"],
  },
};

const findUsersByAttributeTool: Tool = {
  name: "slack_find_users_by_attribute",
  description: "Find users by a specific profile attribute",
  inputSchema: {
    type: "object",
    properties: {
      attribute: {
        type: "string",
        description: "The profile attribute to search (e.g., 'title', 'phone', 'status_text')",
      },
      value: {
        type: "string",
        description: "The value to search for (case insensitive partial match)",
      },
      limit: {
        type: "number",
        description: "Maximum number of matching users to return",
        default: 10,
      },
    },
    required: ["attribute", "value"],
  },
};

const scheduleMessageTool: Tool = {
  name: "slack_schedule_message",
  description: "Schedule a message to be posted to a Slack channel at a future time",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel to post to",
      },
      text: {
        type: "string",
        description: "The message text to post",
      },
      post_at: {
        type: "number",
        description: "Unix timestamp (in seconds) for when to post the message (up to 120 days in the future)",
      },
    },
    required: ["channel_id", "text", "post_at"],
  },
};

class SlackClient {
  private botHeaders: { Authorization: string; "Content-Type": string };

  constructor(botToken: string) {
    this.botHeaders = {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    };
  }

  async getChannels(limit: number = 100, cursor?: string, types: string = "public_channel"): Promise<any> {
    const params = new URLSearchParams({
      types: types,
      exclude_archived: "true",
      limit: Math.min(limit, 200).toString(),
      team_id: process.env.SLACK_TEAM_ID!,
    });

    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await fetch(
      `https://slack.com/api/conversations.list?${params}`,
      { headers: this.botHeaders },
    );

    return response.json();
  }



  async findChannelsByName(names: string[], types: string = "public_channel"): Promise<any> {
    // Helper function to sleep for a specified amount of time
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Create a set of names we're looking for (for O(1) lookups)
    const nameSet = new Set(names);
    const remainingNames = new Set(names);

    // Track results
    const found: any[] = [];
    const results: { [name: string]: any } = {};
    let totalChannelsSearched = 0;

    // Paginate through channels until we find all requested channels or exhaust the list
    let cursor: string | undefined = undefined;
    let pageCount = 0;

    while (remainingNames.size > 0) {
      // Add a random pause between requests (except for the first request)
      if (pageCount > 0) {
        const pauseTime = Math.floor(Math.random() * 750) + 250; // Random time between 250ms and 1000ms
        await sleep(pauseTime);
      }

      pageCount++;

      const channelsResponse = await this.getChannels(1000, cursor, types);

      if (!channelsResponse.ok) {
        return channelsResponse;
      }

      // Process channels in this page
      if (channelsResponse.channels && Array.isArray(channelsResponse.channels)) {
        totalChannelsSearched += channelsResponse.channels.length;

        // Check each channel against our remaining names
        for (const channel of channelsResponse.channels) {
          if (remainingNames.has(channel.name)) {
            // Found a match!
            results[channel.name] = {
              id: channel.id,
              name: channel.name,
              is_private: channel.is_private,
              is_channel: channel.is_channel,
              is_im: channel.is_im,
              is_mpim: channel.is_mpim,
              created: channel.created
            };
            found.push(channel);
            remainingNames.delete(channel.name);

            // If we've found all channels, we can stop searching
            if (remainingNames.size === 0) {
              break;
            }
          }
        }
      }

      // Check if we need to continue pagination
      const hasNextPage = channelsResponse.response_metadata &&
        channelsResponse.response_metadata.next_cursor &&
        channelsResponse.response_metadata.next_cursor.trim() !== '';

      // Stop if we've either found all channels or there are no more pages
      if (remainingNames.size === 0 || !hasNextPage) {
        break;
      }

      // Get the next page
      cursor = channelsResponse.response_metadata.next_cursor;
    }

    // Any names still in the set weren't found
    const notFound = Array.from(remainingNames);

    return {
      ok: true,
      total_channels_searched: totalChannelsSearched,
      pages_searched: pageCount,
      found_count: found.length,
      not_found_count: notFound.length,
      channels: found,
      not_found: notFound,
      results: results
    };
  }

  async postMessage(channel_id: string, text: string): Promise<any> {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: channel_id,
        text: text,
      }),
    });

    return response.json();
  }

  async postReply(
    channel_id: string,
    thread_ts: string,
    text: string,
  ): Promise<any> {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: channel_id,
        thread_ts: thread_ts,
        text: text,
      }),
    });

    return response.json();
  }

  async addReaction(
    channel_id: string,
    timestamp: string,
    reaction: string,
  ): Promise<any> {
    const response = await fetch("https://slack.com/api/reactions.add", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: channel_id,
        timestamp: timestamp,
        name: reaction,
      }),
    });

    return response.json();
  }

  async getChannelHistory(
    channel_id: string,
    limit: number = 10,
  ): Promise<any> {
    const params = new URLSearchParams({
      channel: channel_id,
      limit: limit.toString(),
    });

    const response = await fetch(
      `https://slack.com/api/conversations.history?${params}`,
      { headers: this.botHeaders },
    );

    return response.json();
  }

  async getThreadReplies(channel_id: string, thread_ts: string): Promise<any> {
    const params = new URLSearchParams({
      channel: channel_id,
      ts: thread_ts,
    });

    const response = await fetch(
      `https://slack.com/api/conversations.replies?${params}`,
      { headers: this.botHeaders },
    );

    return response.json();
  }

  async getUsers(limit: number = 100, cursor?: string): Promise<any> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 200).toString(),
      team_id: process.env.SLACK_TEAM_ID!,
    });

    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await fetch(`https://slack.com/api/users.list?${params}`, {
      headers: this.botHeaders,
    });

    return response.json();
  }

  async getUserProfile(user_id: string): Promise<any> {
    const params = new URLSearchParams({
      user: user_id,
      include_labels: "true",
    });

    const response = await fetch(
      `https://slack.com/api/users.profile.get?${params}`,
      { headers: this.botHeaders },
    );

    return response.json();
  }
  async findUsersByName(query: string, limit: number = 10): Promise<any> {
    // We'll need to get all users and filter
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const allUsers: any[] = [];
    let cursor: string | undefined = undefined;
    const searchQuery = query.toLowerCase();
    const matchingUsers: any[] = [];

    // Keep fetching until we have enough matching users or run out of users
    while (matchingUsers.length < limit) {
      // Add a delay to avoid rate limiting, except for the first request
      if (cursor) {
        const pauseTime = Math.floor(Math.random() * 750) + 250;
        await sleep(pauseTime);
      }

      const response = await this.getUsers(200, cursor);

      if (!response.ok) {
        return response;
      }

      if (!response.members || response.members.length === 0) {
        break; // No more users to process
      }

      // Filter users by name
      for (const user of response.members) {
        const realName = (user.real_name || '').toLowerCase();
        const displayName = (user.profile?.display_name || '').toLowerCase();
        const userName = (user.name || '').toLowerCase();

        if (realName.includes(searchQuery) ||
          displayName.includes(searchQuery) ||
          userName.includes(searchQuery)) {
          matchingUsers.push(user);

          if (matchingUsers.length >= limit) {
            break;
          }
        }
      }

      // Check if we need to continue pagination
      if (response.response_metadata?.next_cursor) {
        cursor = response.response_metadata.next_cursor;
      } else {
        break; // No more pages
      }
    }

    return {
      ok: true,
      users: matchingUsers,
      count: matchingUsers.length
    };
  }

  async findUsersByEmail(email: string): Promise<any> {
    const params = new URLSearchParams({
      email: email
    });

    const response = await fetch(
      `https://slack.com/api/users.lookupByEmail?${params}`,
      { headers: this.botHeaders }
    );

    return response.json();
  }

  async findUsersByAttribute(attribute: string, value: string, limit: number = 10): Promise<any> {
    // We'll need to get all users and filter
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const allUsers: any[] = [];
    let cursor: string | undefined = undefined;
    const searchValue = value.toLowerCase();
    const matchingUsers: any[] = [];

    // Keep fetching until we have enough matching users or run out of users
    while (matchingUsers.length < limit) {
      // Add a delay to avoid rate limiting, except for the first request
      if (cursor) {
        const pauseTime = Math.floor(Math.random() * 750) + 250;
        await sleep(pauseTime);
      }

      const response = await this.getUsers(200, cursor);

      if (!response.ok) {
        return response;
      }

      if (!response.members || response.members.length === 0) {
        break; // No more users to process
      }

      // Filter users by the specified attribute
      for (const user of response.members) {
        let attributeValue: string | undefined;

        // Check in profile
        if (user.profile && Object.prototype.hasOwnProperty.call(user.profile, attribute)) {
          attributeValue = String(user.profile[attribute]);
        }
        // Check in user object itself
        else if (Object.prototype.hasOwnProperty.call(user, attribute)) {
          attributeValue = String(user[attribute]);
        }

        if (attributeValue && attributeValue.toLowerCase().includes(searchValue)) {
          matchingUsers.push(user);

          if (matchingUsers.length >= limit) {
            break;
          }
        }
      }

      // Check if we need to continue pagination
      if (response.response_metadata?.next_cursor) {
        cursor = response.response_metadata.next_cursor;
      } else {
        break; // No more pages
      }
    }

    return {
      ok: true,
      users: matchingUsers,
      count: matchingUsers.length
    };
  }

  async scheduleMessage(channel_id: string, text: string, post_at: number): Promise<any> {
    const response = await fetch("https://slack.com/api/chat.scheduleMessage", {
      method: "POST",
      headers: this.botHeaders,
      body: JSON.stringify({
        channel: channel_id,
        text: text,
        post_at: post_at,
      }),
    });

    return response.json();
  }

}



async function main() {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const teamId = process.env.SLACK_TEAM_ID;

  if (!botToken || !teamId) {
    console.error(
      "Please set SLACK_BOT_TOKEN and SLACK_TEAM_ID environment variables",
    );
    process.exit(1);
  }

  console.error("Starting Slack MCP Server...");
  const server = new Server(
    {
      name: "Slack MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const slackClient = new SlackClient(botToken);

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      console.error("Received CallToolRequest:", request);
      try {
        if (!request.params.arguments) {
          throw new Error("No arguments provided");
        }

        switch (request.params.name) {
          case "slack_list_channels": {
            const args = request.params.arguments as unknown as ListChannelsArgs;
            const response = await slackClient.getChannels(
              args.limit,
              args.cursor,
              args.types
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_find_channels_by_name": {
            const args = request.params.arguments as unknown as FindChannelsByNameArgs;
            if (!args.names || !Array.isArray(args.names) || args.names.length === 0) {
              throw new Error("Missing or invalid required argument: names (should be a non-empty array)");
            }
            const response = await slackClient.findChannelsByName(
              args.names,
              args.types
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_post_message": {
            const args = request.params.arguments as unknown as PostMessageArgs;
            if (!args.channel_id || !args.text) {
              throw new Error(
                "Missing required arguments: channel_id and text",
              );
            }
            const response = await slackClient.postMessage(
              args.channel_id,
              args.text,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_reply_to_thread": {
            const args = request.params
              .arguments as unknown as ReplyToThreadArgs;
            if (!args.channel_id || !args.thread_ts || !args.text) {
              throw new Error(
                "Missing required arguments: channel_id, thread_ts, and text",
              );
            }
            const response = await slackClient.postReply(
              args.channel_id,
              args.thread_ts,
              args.text,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_add_reaction": {
            const args = request.params.arguments as unknown as AddReactionArgs;
            if (!args.channel_id || !args.timestamp || !args.reaction) {
              throw new Error(
                "Missing required arguments: channel_id, timestamp, and reaction",
              );
            }
            const response = await slackClient.addReaction(
              args.channel_id,
              args.timestamp,
              args.reaction,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_channel_history": {
            const args = request.params
              .arguments as unknown as GetChannelHistoryArgs;
            if (!args.channel_id) {
              throw new Error("Missing required argument: channel_id");
            }
            const response = await slackClient.getChannelHistory(
              args.channel_id,
              args.limit,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_thread_replies": {
            const args = request.params
              .arguments as unknown as GetThreadRepliesArgs;
            if (!args.channel_id || !args.thread_ts) {
              throw new Error(
                "Missing required arguments: channel_id and thread_ts",
              );
            }
            const response = await slackClient.getThreadReplies(
              args.channel_id,
              args.thread_ts,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_users": {
            const args = request.params.arguments as unknown as GetUsersArgs;
            const response = await slackClient.getUsers(
              args.limit,
              args.cursor,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_user_profile": {
            const args = request.params
              .arguments as unknown as GetUserProfileArgs;
            if (!args.user_id) {
              throw new Error("Missing required argument: user_id");
            }
            const response = await slackClient.getUserProfile(args.user_id);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_find_users_by_name": {
            const args = request.params.arguments as unknown as FindUsersByNameArgs;
            if (!args.query) {
              throw new Error("Missing required argument: query");
            }
            const response = await slackClient.findUsersByName(
              args.query,
              args.limit
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_find_users_by_email": {
            const args = request.params.arguments as unknown as FindUsersByEmailArgs;
            if (!args.email) {
              throw new Error("Missing required argument: email");
            }
            const response = await slackClient.findUsersByEmail(args.email);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_find_users_by_attribute": {
            const args = request.params.arguments as unknown as FindUsersByAttributeArgs;
            if (!args.attribute || !args.value) {
              throw new Error("Missing required arguments: attribute and value");
            }
            const response = await slackClient.findUsersByAttribute(
              args.attribute,
              args.value,
              args.limit
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_schedule_message": {
            const args = request.params.arguments as unknown as ScheduleMessageArgs;
            if (!args.channel_id || !args.text || args.post_at === undefined) {
              throw new Error(
                "Missing required arguments: channel_id, text, and post_at",
              );
            }
            const response = await slackClient.scheduleMessage(
              args.channel_id,
              args.text,
              args.post_at,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error("Error executing tool:", error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
        };
      }
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
    return {
      tools: [
        listChannelsTool,
        findChannelsByNameTool,
        postMessageTool,
        replyToThreadTool,
        addReactionTool,
        getChannelHistoryTool,
        getThreadRepliesTool,
        getUsersTool,
        getUserProfileTool,
        findUsersByNameTool,
        findUsersByEmailTool,
        findUsersByAttributeTool,
        scheduleMessageTool,
      ],
    };
  });

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);

  console.error("Slack MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
