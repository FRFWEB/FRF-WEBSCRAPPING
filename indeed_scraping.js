import fetch from "node-fetch";
import cheerio from "cheerio";
import fs from "fs"
import { FormData } from "formdata-node";
import {FormDataEncoder} from "form-data-encoder"
import {Readable} from "stream"
import path from "path";

console.log('init task')
setInterval(init,54000000)


/*

INDEED DATA

*/

function init(){

const geoLocation = 'Indianapolis'
const urlIndeed = `https://www.indeed.com/jobs?q=&l=${geoLocation}&start=`
const pageUrl = 20

async function getDataUrlIndeed(URL, page){
    let data = ''
    const indexPage = page;
    const response = await fetch(URL+indexPage)
    data = response.text()
    return data
}

const getIndeedArrayData = getDataUrlIndeed(urlIndeed, pageUrl).then( content =>{
    let title, description, companyName, rating, companyLocation, salary, href
    let objJobs = []
    const $ = cheerio.load(content)
    $('ul.jobsearch-ResultsList li').each(function (index, element) {
        //PREAPRE DATA
        href = $(element).find('.job_seen_beacon table tbody tr .resultContent .jobTitle a').attr('href')
        title = $(element).find('.job_seen_beacon table tbody tr .resultContent .jobTitle a span').text()
        companyName = $(element).find('.job_seen_beacon table tbody tr .resultContent .company_location .companyName a').text()
        rating = $(element).find('.job_seen_beacon table tbody tr .resultContent .company_location .ratingsDisplay a span span').text()
        companyLocation = $(element).find('.job_seen_beacon table tbody tr .resultContent .company_location .companyLocation').text()
        description = $(element).find('.job_seen_beacon table tbody tr td .result-footer .job-snippet ul li').text()
        salary = $(element).find('.job_seen_beacon table tbody tr .resultContent .salaryOnly .attribute_snippet').text()
        //PREAPRE ARRAY OBJECT
        if(href != undefined && title != '' && companyName != '' && rating != '' && companyLocation != '' && description != '' && salary != ''){
            objJobs.push({
                titleJob: title,
                companyNameJob: companyName,
                companyLocationJob: companyLocation,
                companyDescription: description,
                companySalary: salary,
                companyRating: rating,
                href: `https://www.indeed.com${href}`
            })
            /*
            //DEBUG
            
            console.log('-----------')
            console.log(href)
            console.log(title)
            console.log(companyName)
            console.log(rating)
            console.log(companyLocation)
            console.log(description)
            console.log(salary)
            console.log('-----------')

            */
        }
    });
    return objJobs
})

getIndeedArrayData.then(data =>{
     //UPLOAD FILE TO STRAPI
    for (let index = 0; index < data.length; index++) {
        //PREPARE NEW OBJECT
        let sendData = { 
            title: data[index].titleJob + ' - ' + data[index].companyNameJob,
            location: data[index].companyLocationJob,
            content: data[index].companyDescription,
            salary: data[index].companySalary,
            rating: data[index].companyRating,
            url: data[index].href
        }
        //CREATE FORMDATA
        let formData = new FormData()
        formData.set('data', JSON.stringify(sendData))
        const encoder = new FormDataEncoder(formData)
        //SEND FORMDATA TO STRAPI
        fetch('http://gardenaecondev.com/backend/api/jobs', {
            method: "post",
            headers: encoder.headers,
            body: Readable.from(encoder)
        })
        .then(response => {
            if(response.status === 200){
                console.log('Job '+data[index].titleJob+' Submit')
            }else{
                console.log('Error')
            }
        })
        .catch(error =>{
            console.log(error)
        })
        }
        //GET DATE
        let date = new Date()
        let getDay = date.getDay()
        let getMount = date.getMonth()
        let getYear = date.getFullYear()
        let getHours = date.getHours()
        let getMinutes = date.getMinutes()
        //GET ROOT FILE
        let getRootFile = process.cwd()
        //CREATE JSON FILE
        if(!fs.existsSync(path.join(getRootFile,'tmp'))){
            fs.mkdirSync(path.join(getRootFile,'tmp'),{recursive: true })
        }
        fs.writeFileSync(path.join(getRootFile,'tmp') + "/indeed"+getDay+"_"+getMount+"_"+getYear+"_"+getHours+"_"+getMinutes+".json",JSON.stringify(data),{encoding: "utf8",flag: "w",mode: 0o666});
        console.log('finish task: ' + date)
})

}