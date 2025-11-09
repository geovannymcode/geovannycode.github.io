import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

// Lenguajes que vas a resaltar
import java from "highlight.js/lib/languages/java";
import kotlin from "highlight.js/lib/languages/kotlin";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import sql from "highlight.js/lib/languages/sql";
import { visit } from "unist-util-visit";

const postsDirectory = path.join(process.cwd(), "src/data/posts");
const jsonDir = "src/data/.json";

export function getSortedPostsData() {
  // Get file names under /posts
  const fileNames = fs.readdirSync(postsDirectory);

  const allPostsData = fileNames
    .filter((fileName) => fileName.includes(".md"))
    .map((fileName) => {
      // Remove ".md" from file name to get id
      const id = fileName.replace(/\.md$/, "");

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);

      // Combine the data with the id
      return {
        id,
        ...matterResult.data,
      };
    });
  // Sort posts by date
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getCategoryPosts(cat_id) {
  // Get file names under /posts
  const allData = [];
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.includes(".md"))
    .map((fileName) => {
      // Remove ".md" from file name to get id
      const id = fileName.replace(/\.md$/, "");

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);
      const cats = matterResult.data.categories;

      if (cats != undefined) {
        const catsSlug = cats.map((element) => {
          return element.toLowerCase().replace(" ", "-");
        });

        if (catsSlug != undefined) {
          // Check current category
          if (catsSlug.includes(cat_id)) {
            // Combine the data with the id
            allData.push({
              id,
              ...matterResult.data,
            });
          }
        }
      }
    });
  // Sort posts by date
  return allData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getTagPosts(tag_id) {
  // Get file names under /posts
  const allData = [];
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.includes(".md"))
    .map((fileName) => {
      // Remove ".md" from file name to get id
      const id = fileName.replace(/\.md$/, "");

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);
      const tags = matterResult.data.tags;

      if (tags != undefined) {
        const tagsSlug = tags.map((element) => {
          return element.toLowerCase().replace(" ", "-");
        });

        if (tagsSlug != undefined) {
          // Check current category
          if (tagsSlug.includes(tag_id)) {
            // Combine the data with the id
            allData.push({
              id,
              ...matterResult.data,
            });
          }
        }
      }
    });
  // Sort posts by date
  return allData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getAuthorPosts(author_id) {
  // Get file names under /posts
  const allData = [];
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.includes(".md"))
    .map((fileName) => {
      // Remove ".md" from file name to get id
      const id = fileName.replace(/\.md$/, "");

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);
      //const author = matterResult.data.author.toLowerCase().replace(' ', '-');

      const rawAuthor = matterResult?.data?.author;
      if (typeof rawAuthor !== "string") {
        return;
      }
      const author = rawAuthor.toLowerCase().trim().replace(/\s+/g, "-");

      // Check current category
      if (author == author_id) {
        // Combine the data with the id
        allData.push({
          id,
          ...matterResult.data,
        });
      }
    });
  // Sort posts by date
  return allData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getArchivePosts(archive_id) {
  // Get file names under /posts
  const allData = [];
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.includes(".md"))
    .map((fileName) => {
      // Remove ".md" from file name to get id
      const id = fileName.replace(/\.md$/, "");

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);

      const dateObj = new Date(matterResult.data.date);
      const dateSlug = dateObj.getMonth() + 1 + "-" + dateObj.getFullYear();

      // Check current category
      if (dateSlug == archive_id) {
        // Combine the data with the id
        allData.push({
          id,
          ...matterResult.data,
        });
      }
    });
  // Sort posts by date
  return allData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getPaginatedPostsData(limit, page) {
  // Get file names under /posts
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.includes(".md"))
    .map((fileName) => {
      // Remove ".md" from file name to get id
      const id = fileName.replace(/\.md$/, "");

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);

      // Combine the data with the id
      return {
        id,
        ...matterResult.data,
      };
    });
  // Sort posts by date
  allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });

  const paginatedPosts = allPostsData.slice((page - 1) * limit, page * limit);
  return { posts: paginatedPosts, total: allPostsData.length };
}

export function getFeaturedPostsData(ids) {
  // Get file names under /posts
  const fileNames = fs.readdirSync(postsDirectory);
  const allData = [];
  fileNames
    .filter((fileName) => fileName.includes(".md"))
    .map((fileName) => {
      // Remove ".md" from file name to get id
      const id = fileName.replace(/\.md$/, "");

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);

      if (ids.includes(id)) {
        // Combine the data with the id
        allData.push({
          id,
          ...matterResult.data,
        });
      }
    });

  // Sort posts by date
  return allData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getRelatedPosts(current_id) {
  // Get file names under /posts
  const fileNames = fs.readdirSync(postsDirectory);
  const allData = [];

  fileNames
    .filter((fileName) => fileName.includes(".md"))
    .map((fileName) => {
      // Remove ".md" from file name to get id
      const id = fileName.replace(/\.md$/, "");

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);

      // Exclude current id from result

      if (id != current_id) {
        // Combine the data with the id
        allData.push({
          id,
          ...matterResult.data,
        });
      }
    });

  // Sort posts by date
  return allData.sort((a, b) => {
    if (a.category > b.category) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getAllPostsIds() {
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter((fileName) => fileName.includes(".md"))
    .map((fileName) => {
      return {
        params: {
          id: fileName.replace(/\.md$/, ""),
        },
      };
    });
}

export async function getPostData(id) {
  const fullPath = path.join(postsDirectory, `${id}.md`);

  if (fs.existsSync(fullPath)) {
    const fileContents = fs.readFileSync(fullPath, "utf8");

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    const processedContent = await remark()
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeHighlight, {
        ignoreMissing: true,
        detect: false, // confía en el lenguaje del fence
        languages: {
          java,
          kotlin,
          bash,
          javascript,
          typescript,
          json,
          xml,
          yaml,
          sql,
        },
      })
        .use(rehypeJavaAnnotationAttrs) 
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(matterResult.content);

    const contentHtml = processedContent.toString();

    // Combine the data with the id and contentHtml
    return {
      id,
      contentHtml,
      //content: matterResult.content,
      ...matterResult.data,
    };
  } else {
    return;
  }
}

export async function generateJsonPostsData() {
  // Get file names under /posts
  const fileNames = fs.readdirSync(postsDirectory);

  const allPostsData = fileNames
    .filter((fileName) => fileName.includes(".md"))
    .map((fileName) => {
      // Remove ".md" from file name to get id
      const id = fileName.replace(/\.md$/, "");

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents);
      const content = matterResult.content;

      // Combine the data with the id
      return {
        id,
        content,
        ...matterResult.data,
      };
    });
  // Sort posts by date
  const posts = allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
  // Create JSON File
  try {
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir);
    }
    fs.writeFileSync(`${jsonDir}/posts.json`, JSON.stringify(posts));
  } catch (err) {
    console.error(err);
  }
}

// Plugin: resalta claves y strings dentro de anotaciones Java
function rehypeJavaAnnotationAttrs() {
  return (tree) => {
    visit(tree, "element", (node) => {
      const cls = node.properties?.className || [];
      if (node.tagName === "code" && cls.includes("language-java")) {
        if (node.children?.length === 1 && node.children[0].type === "text") {
          let txt = node.children[0].value;

          // Solo dentro de @Anotacion(...): envolvemos clave= y "string"
          txt = txt.replace(
            /(@[\w.]+)\s*\(([\s\S]*?)\)/g,
            (full, atName, inside) => {
              const withAttrs = inside
                // clave =
                .replace(/\b([a-zA-Z_]\w*)\s*=/g, '<span class="hljs-attr">$1</span>=')
                // "string"
                .replace(/"([^"]*)"/g, '<span class="hljs-string">"$1"</span>');
              return `${atName}(${withAttrs})`;
            }
          );

          // volvemos el nodo en HTML crudo para conservar los spans
          node.children = [{ type: "raw", value: txt }];
        }
      }
    });
  };
}