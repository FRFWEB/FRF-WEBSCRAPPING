import fetch from "node-fetch";
import cheerio from "cheerio";
import fs from "fs";
import { FormData } from "formdata-node";
import { FormDataEncoder } from "form-data-encoder";
import { Readable } from "stream";
import path from "path";

console.log("init task");
setInterval(init, 18000000);
/*

WTHR.COM DATA

*/

function init() {
  const url = `https://www.wthr.com/local`;

  async function getDataUrlNews(URL) {
    let data = "";
    const response = await fetch(URL);
    data = response.text();
    return data;
  }
  getDataUrlNews(url).then((content) => {
    //LOAD DATA OF DOCUMENT INDEX.HTML
    const $ = cheerio.load(content);
    $(
      "div.grid__main .grid__cell_columns_1 .grid__module .grid__module-sizer_name_headline-list .headline-list ul li"
    ).each((index, el) => {
      //GET URL POST
      let hrefPost;
      hrefPost = $(el).find("a").attr("href");
      let getPostData = getDataUrlNews(hrefPost).then((contentPost) => {
        //PREPARE VARIABLES
        let title, extract, image, thumbnail, objPost;
        //LOAD DATA OF POST
        const $ = cheerio.load(contentPost);
        //EXTRACT DATA OF POST
        title = $(
          ".page__grid .grid .grid__section_theme_default .grid__content .grid__main_sticky_right .grid__cell_columns_2 .grid__module .grid__module-sizer_name_article article .article__headline"
        ).text();
        extract = $(
          ".page__grid .grid .grid__section_theme_default .grid__content .grid__main_sticky_right .grid__cell_columns_2 .grid__module .grid__module-sizer_name_article article .article__summary"
        ).text();
        try {
          image = $(
            ".page__grid .grid .grid__section_theme_default .grid__content .grid__main_sticky_right .grid__cell_columns_2 .grid__module .grid__module-sizer_name_article article .article__lead-asset .photo .photo__image .photo__ratio-enforcer .photo__ratio-enforced div.lazy-image"
          )
            .find(".lazy-image__image_blur_true")
            .attr("data-srcset")
            .split(", ");
        } catch (error) {
          thumbnail = $(
            ".page__grid .grid .grid__section_theme_default .grid__content .grid__main_sticky_right .grid__cell_columns_2 .grid__module .grid__module-sizer_name_article article .article__lead-asset div.video img.video__endslate-thumbnail"
          ).attr("src");
        }
        //console.log(title.trim() + " --- ");
        let getContentArticle = getDataUrlNews(hrefPost).then(
          (contentArticle) => {
            const $ = cheerio.load(contentArticle);
            let serachArticleContent = $(
              ".article__body .article__section_type_text"
            ).each((i, el) => (el != undefined ? $(el).find("p") : ""));
            return serachArticleContent.text();
          }
        );
        return getContentArticle.then((setContentArticle) => {
          if (title != "") {
            if (image != undefined) {
              objPost = {
                title: title,
                extract: extract,
                thumbnail: image[2],
                imageUrl: image[4],
                altName: title,
                url: hrefPost,
                category: "noticies",
                content: setContentArticle,
              };
            } else {
              objPost = {
                title: title,
                extract: extract,
                thumbnail: thumbnail,
                imageUrl: thumbnail,
                altName: title,
                url: hrefPost,
                category: "noticies",
                content: setContentArticle,
              };
            }
          }
          return objPost;
        });
      });

      getPostData.then((content) => {
        //CREATE FORMDATA
        let formData = new FormData();
        formData.set("data", JSON.stringify(content));
        const encoder = new FormDataEncoder(formData);

        //SEND FORMDATA TO STRAPI
        fetch("http://gardenaecondev.com/backend/api/news", {
          method: "post",
          headers: encoder.headers,
          body: Readable.from(encoder),
        })
          .then((response) => {
            if (response.status === 200) {
              console.log("Post " + content.title + " Submit");
            } else {
              console.log("Error");
            }
          })
          .catch((error) => {
            console.log(error);
          });
      });
    });
  });
}
