/*  Copyright (C) 2016 Bogdan Cuza

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/
var scopes = require('unity-js-scopes');
var https = require('https');

var TEMPLATE = {
    "schema-version": 1,
    "template": {
        "category-layout": "grid",
        "card-size": "medium"
    },
    "components": {
        "title": "title",
        "art": {
            "field": "art",
            "aspect-ratio": 0.64
        },
        "subtitle": "subtitle"
    }
};

var renderer = new scopes.lib.CategoryRenderer(JSON.stringify(TEMPLATE));

function getData(path, fun) {
    var options = {
        hostname: "api.wattpad.com",
        path: path,
        port: 443,
        method: "GET",
        headers: {
            "authorization": "Lt8bfMKJZvM8soj5dBxvVewCKJEsPH8pfmRZEvdBvDvJ"
        }
    };

    https.request(options, function(res) {
        var r = "";

        res.on("data", function(chunk) {
            r += chunk;
        });

        res.on("end", function() {
            fun(JSON.parse(r));
        });
    }).end();
}

function createPath(category, type, query, cardinality) {
    return "/v4/stories/?filter=" + type + (category == "" ? "" : "&category=" + category) + (query.trim() == "" ? "" : "&query=" + encodeURIComponent(query.trim())) + "&limit=" + cardinality;
}

function createResult(category, reply, url, art, title, username, description, tags, parts, votes, reads, comments, date) {
    var res = new scopes.lib.CategorisedResult(category);
    res.set_uri(url);
    res.set_title(title);
    res.set_art(art);
    res.set("subtitle", username);
    res.set("description", description);
    res.set("tags", tags);
    res.set("parts", parts);
    res.set("votes", votes);
    res.set("reads", reads);
    res.set("comments", comments);
    res.set("date", (new Date(date.slice(0, 10))).toLocaleDateString());
    reply.push(res);
}

scopes.self.initialize({}, {
    run: function() {
        console.log('Running...')
    },
    start: function(scope_id) {
        console.log('Starting scope id: ' + scope_id + ', ' + scopes.self.scope_directory)
    },
    search: function(canned_query, metadata) {
        return new scopes.lib.SearchQuery(
            canned_query,
            metadata,
            // run
            function(search_reply) {
                var qs = canned_query.query_string().trim();
                if (metadata.is_aggregated()) {
                    var type = scopes.self.settings["aggregation_type"].get_int();
                    switch (type) {
                        case 0:
                            getData(createPath("", "hot", qs, metadata.cardinality()), function(r) {
                                if (r.stories.length != 0) {
                                    var cat = search_reply.register_category("hot", "Hot", "", renderer);
                                    for (story of r.stories) {
                                        createResult(cat, search_reply, story.url, story.cover, story.title, story.user, story.description, story.tags, story.numParts, story.voteCount, story.readCount, story.commentCount, story.createDate);
                                    }
                                }
                                search_reply.finished();
                            });
                            break;
                        case 1:
                            if (qs.indexOf(" ") == -1) {
                                getData(createPath(canned_query.department_id(), "new", (qs[0] == "#" ? qs : "#" + qs), metadata.cardinality()), function(r) {
                                    if (r.stories.length != 0) {
                                        var cat = search_reply.register_category("new", "New", "", renderer);
                                        for (story of r.stories) {
                                            createResult(cat, search_reply, story.url, story.cover, story.title, story.user, story.description, story.tags, story.numParts, story.voteCount, story.readCount, story.commentCount, story.createDate);
                                        }
                                    }
                                    search_reply.finished();
                                });
                            }
                            break;
                        case 2:
                            if (qs != "") {
                                getData(createPath(canned_query.department_id(), "top_category", qs, metadata.cardinality()), function(r) {
                                    if (r.stories.length != 0) {
                                        var cat = search_reply.register_category("top", "Top in category", "", renderer);
                                        for (story of r.stories) {
                                            createResult(cat, search_reply, story.url, story.cover, story.title, story.user, story.description, story.tags, story.numParts, story.voteCount, story.readCount, story.commentCount, story.createDate);
                                        }
                                    }
                                    search_reply.finished();
                                });
                            }
                            break;
                    }
                } else {
                    var root = new scopes.lib.Department("", canned_query, "General");
                    getData("/v4/categories", function(result) {
                        for (category of result.categories) {
                            root.add_subdepartment(new scopes.lib.Department(String(category.id), canned_query, category.name));
                        }
                        search_reply.register_departments(root);

                        getData(createPath(canned_query.department_id(), "hot", qs, metadata.cardinality()), function(r) {
                            if (r.stories.length != 0) {
                                var cat = search_reply.register_category("hot", "Hot", "", renderer);
                                for (story of r.stories) {
                                    createResult(cat, search_reply, story.url, story.cover, story.title, story.user, story.description, story.tags, story.numParts, story.voteCount, story.readCount, story.commentCount, story.createDate);
                                }
                            }
                            if (qs.indexOf(" ") == -1) {
                                getData(createPath(canned_query.department_id(), "new", (qs[0] == "#" ? qs : "#" + qs), metadata.cardinality()), function(r) {
                                    if (r.stories.length != 0) {
                                        var cat = search_reply.register_category("new", "New", "", renderer);
                                        for (story of r.stories) {
                                            createResult(cat, search_reply, story.url, story.cover, story.title, story.user, story.description, story.tags, story.numParts, story.voteCount, story.readCount, story.commentCount, story.createDate);
                                        }
                                    }
                                    if (qs != "") {
                                        getData(createPath(canned_query.department_id(), "top_category", qs, metadata.cardinality()), function(r) {
                                            if (r.stories.length != 0) {
                                                var cat = search_reply.register_category("top", "Top in category", "", renderer);
                                                for (story of r.stories) {
                                                    createResult(cat, search_reply, story.url, story.cover, story.title, story.user, story.description, story.tags, story.numParts, story.voteCount, story.readCount, story.commentCount, story.createDate);
                                                }
                                            }
                                            search_reply.finished();
                                        });
                                    } else {
                                        search_reply.finished();
                                    }
                                });
                            } else if (qs != "") {
                                getData(createPath(canned_query.department_id(), "top_category", qs, metadata.cardinality()), function(r) {
                                    if (r.stories.length != 0) {
                                        var cat = search_reply.register_category("top", "Top in category", "", renderer);
                                        for (story of r.stories) {
                                            createResult(cat, search_reply, story.url, story.cover, story.title, story.user, story.description, story.tags, story.numParts, story.voteCount, story.readCount, story.commentCount, story.createDate);
                                        }
                                    }
                                    search_reply.finished();
                                });
                            } else {
                                search_reply.finished();
                            }
                        });
                    });
                }
            },
            // cancelled
            function() {});
    },
    preview: function(result, action_metadata) {
        return new scopes.lib.PreviewQuery(
            result,
            action_metadata,
            // run
            function(preview_reply) {
                var layout1col = new scopes.lib.ColumnLayout(1);
                var layout2col = new scopes.lib.ColumnLayout(2);
                var layout3col = new scopes.lib.ColumnLayout(3);
                layout1col.add_column(["image", "header", "description", "additional-info", "button"]);

                if (result.get("tags") != "") {
                    layout2col.add_column(["image", "header", "tags", "reads", "votes", "comments", "date", "button"]);
                } else {
                    layout2col.add_column(["image", "header", "reads", "votes", "comments", "date", "button"]);
                }

                layout2col.add_column(["description"]);

                layout3col.add_column(["image", "header", "button"]);
                layout3col.add_column(["description"]);

                if (result.get("tags") != "") {
                    layout3col.add_column(["tags", "reads", "votes", "comments", "date"]);
                } else {
                    layout3col.add_column(["reads", "votes", "comments", "date"]);
                }

                preview_reply.register_layout([layout1col, layout2col, layout3col]);

                var header = new scopes.lib.PreviewWidget("header", "header");
                header.add_attribute_mapping("title", "title");
                header.add_attribute_mapping("subtitle", "subtitle");

                var image = new scopes.lib.PreviewWidget("image", "image");
                image.add_attribute_mapping("source", "art");
                image.add_attribute_value("share-data", {
                    "uri": result.get("uri"),
                    "content-type": "links"
                });

                var description = new scopes.lib.PreviewWidget("description", "text");
                description.add_attribute_mapping("text", "description");

                var button = new scopes.lib.PreviewWidget("button", "actions");
                button.add_attribute_value("actions", {
                    "label": "Open",
                    "id": "btn",
                    "uri": result.get("uri")
                });

                var tags = new scopes.lib.PreviewWidget("tags", "text");
                tags.add_attribute_value("text", "Tags: " + result.get("tags"));

                var reads = new scopes.lib.PreviewWidget("reads", "text");
                reads.add_attribute_value("text", result.get("reads") + " reads");

                var comments = new scopes.lib.PreviewWidget("comments", "text");
                comments.add_attribute_value("text", result.get("comments") + " comments");

                var votes = new scopes.lib.PreviewWidget("votes", "text");
                votes.add_attribute_value("text", result.get("votes") + " ♥");

                var date = new scopes.lib.PreviewWidget("date", "text");
                date.add_attribute_value("text", "Date created: " + result.get("date"));

                var info = new scopes.lib.PreviewWidget("additional-info", "expandable");
                info.add_attribute_value("title", "Additional info");
                if (result.get("tags") != "") info.add_widget(tags);
                info.add_widget(reads);
                info.add_widget(votes);
                info.add_widget(comments);
                info.add_widget(date);

                if (result.get("tags") != "") {
                    preview_reply.push([image, header, description, info, button, tags, reads, votes, comments, date]);
                } else {
                    preview_reply.push([image, header, description, info, button, reads, votes, comments, date]);
                }
                preview_reply.finished();
            },
            // cancelled
            function() {});
    }
});
