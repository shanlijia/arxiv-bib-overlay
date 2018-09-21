import { computed, observable } from 'mobx'
import { observer } from 'mobx-react'
import * as React from 'react'
import { DataSource, Paper, PaperGroup, SorterConfig } from '../api/document'
import { get_current_article } from '../arxiv_page'
import { API_ARTICLE_COUNT, PAGE_LENGTH } from '../bib_config'
import { sorter } from './ColumnSorter'
import { PaperDiv } from './PaperDiv'

@observer
export class ColumnView extends React.Component<{dataSource: DataSource, paperGroup: PaperGroup,
    name: string}, {}> {
    /**
     * Filtered sorted papers for this column.
     * @computed makes it so this value will trigger a render change when
     * it's dependent observable values change.
     */
    @computed
    get fdata(): Paper[] {
        if (!this.props.paperGroup) {
            return []
        }
        const datacopy = this.props.paperGroup.documents.slice()
        return this.filterPapers(this.sortPapers(this.props.paperGroup, datacopy))
    }

    /** Slice of fdata Papers for current page.   */
    @computed
    get pdata(): Paper[] {
        const papers = this.fdata
        const start = PAGE_LENGTH * (this.page - 1)
        const end = Math.min(start + PAGE_LENGTH, papers.length)
        return papers.slice(start, end)
    }

    @observable
    sort_field: string = ''

    @observable
    sort_order: 'up' | 'down' = 'up'

    @observable
    filter_text: string = ''

    @observable
    page = 1

    render() {
        const filt = this.fdata
        const group = this.props.paperGroup
        const datasource = this.props.dataSource
        const papers = group ? this.pdata : []
        if (!this.props.paperGroup) {
            return null
        }

        let count_msg: string = ''
        if (filt.length !== group.count) {
            count_msg = `(${filt.length}/${group.count})`
        } else {
            count_msg = `(${group.count})`
        }

        const mailto = (
            'mailto:' + datasource.email +
            '?subject=Reference and citation data for arXiv article ' +
            get_current_article()
        )

        const aside = (
            `Only displaying the ${API_ARTICLE_COUNT} most cited articles.` +
            `For all articles, follow this link to ${datasource}.`
        )
        const star = (
            group.documents.length === API_ARTICLE_COUNT ?
            <a title={aside} href={group.header_url} target='_blank' className='bib-star'>*</a> : null
        )

        const utils = (
            <div className='bib-utils'>
            <div className='center'>{this.create_filter_div()}</div>
            <div className='center'>{this.create_sorter_div()}</div>
            <div className='center'>{this.create_paging_div()}</div>
            </div>
        )
        const utils_div = group.count === 0 ? null : utils

        return (
            <div className='bib-col' id={'col-' + this.props.name.toLocaleLowerCase()}>
              <div className='bib-col-header'>
                <span className='bib-col-center'>
                <a className='bib-col-title' href={group.header_url}>
                {this.props.name} {count_msg} {star}
                </a>
                </span>
                <div className='bib-branding bib-col-center'>
                  <div className='bib-col-aside bib-branding-info'>
                    <span>Data provided by:</span><br/>
                    <span>(<a href={mailto}>report data issues</a>)</span>
                  </div>
                  <div className='bib-branding-logo'>
                    <a target='_blank' href={datasource.homepage}>
                      <img alt={datasource.longname} src={datasource.logo} height='32px' width='auto'/>
                    </a>
                  </div>
                </div>
              </div>
              {utils_div}
              <div>
                {papers.map(paper => <PaperDiv paper={paper}/>)}
              </div>
            </div>
        )
                //{papers.map(paper => <PaperDiv key={paper.api || paper.recid || paper.url} paper={paper}/>)}
    }

    create_filter_div() {
        return (
            <div className='bib-filter'>
              <label htmlFor='bib-filter-input--' className='bib-filter-label'>Filter: </label>
              <input type='search' id='bib-filter-input--'
                className='bib-filter-input' value={this.filter_text}
                onChange={(e) => this.filter_text = e.target.value}/>
            </div>
        )
    }

    sortPapers(paperGroup: PaperGroup, data: Paper[]): Paper[] {
        if (!paperGroup || ! data) { return [] }

        const field = this.sort_field || paperGroup.sorting.sorters_default
        const sorters = this.props.paperGroup.sorting.sorters

        if (sorters[field] && sorters[field].func) {
            return sorter(data, sorters[field].func, this.sort_order)
        } else {
            console.log(`Could not sort: no sort entry in sorter for '${field}'
                Check datasource sorting configuration.`)
            return data
        }
    }

    filterPapers(data: Paper[]): Paper[] {
        if (this.filter_text.length === 0 || this.filter_text === '') {
            return data
        }

        const words = this.filter_text.toLocaleLowerCase().split(' ')
        let output = data
        for (const word of words) {
            const newlist: Paper[] = []
            for (const doc of output) {
                if (doc.searchline.includes(word)) {
                    newlist.push(doc)
                }
            }
            output = newlist
        }
        return output
    }

    create_sorter_div() {
        if (!this.props.paperGroup.sorting) {
            return null
        }

        return(
            <div className='bib-sorter'>
              <label htmlFor='sort_field--' className='sort-label'>Sort: </label>
              <select className='sort_field' id='sort_field--'
                onChange={(e) => {this.sort_field = e.target.value}}
                value={this.sort_field}>
              {this.sort_options(this.props.paperGroup.sorting)}
              </select>

              <span className='bib-sort-arrow sort-label'>
              <a onClick={(_) => this.sort_order = this.sort_order === 'up' ? 'down' : 'up'}>
                <span className={this.sort_order !== 'up' ? 'disabled' : ''}
                  title='Sort ascending'>▲</span>
                <span className={this.sort_order !== 'down' ? 'disabled' : ''}
                  title='Sort descending'>▼</span>
              </a>
              </span>
            </div>
        )
    }

    sort_options( sortConfig: SorterConfig) {
        if (!sortConfig) {
            return []
        }

        return sortConfig.sorters_order.map(key => {
            if (sortConfig.sorters[key]) {
                return (
                    <option value={key} key={key}>{sortConfig.sorters[key].name}</option>
                )
            } else {
                if (key) {
                    console.log(`No sorter with key '${key}' Check datasource sorting configuration.`)
                }
                return null
            }
        })
    }

    /**
     * This is a bit of a mess, but it basically ensures that the page list
     * looks visually uniform independent of the current page number. We want
     *   - always the same number of elements
     *   - always first / last pages, and prev / next
     *        < 1̲ 2 3 4 5 . 9 >
     *        < 1 2 3̲ 4 5 . 9 >
     *        < 1 2 3 4̲ 5 . 9 >
     *        < 1 . 4 5̲ 6 . 9 >
     *        < 1 . 5 6̲ 7 8 9 >
     * This makes the numbers easier to navigate and more visually appealing.
     */
    create_paging_div() {
        if (!this.fdata) {return null}

        const B = 1              /* number of buffer pages on each side of current */
        const P = this.page      /* shortcut to current page */
        const L = Math.floor((this.fdata.length - 1) / PAGE_LENGTH) + 1  /* total pages */
        const S = 2 * B + 2 * 2 + 1  /* number of total links in the pages sections:
                           2*buffer + 2*(first number + dots) + current */
        const[langle, rangle, dots] = ['◀',  '▶', '...']

        const _nolink = (txt: string|number, classname?: string) => {
            classname = (classname === undefined) ? 'disabled' : classname
            return <li className={classname}><span>{txt}</span></li>
        }
        const _link = (n: number, txt?: string) => {
            return (
                <li><a title={`Page ${n}`} href={`javascript:${n};`} onClick={(e) => this.page = n}>
                {(txt === undefined) ? n : txt}</a></li>
            )
        }
        const _inclink = (dir: -1|1) => { /* << >> links */
            const txt = (dir < 0) ? langle : rangle
            return ((P + dir < 1) || (P + dir > L)) ? _nolink(txt) : _link(P + dir, txt)
        }
        const _pagelink = (n: number, show_dots?: any) => {
            const a = (show_dots === undefined) ? true : show_dots
            return !a ? _nolink(dots) : ((n === P) ? _nolink(n, 'bold') : _link(n))
        }

        const  page_links: JSX.Element[] = []
        page_links.push(_inclink(-1))

        if (L <= S) {
            // just show all numbers if the number of pages is less than the slots
            for (let i = 1; i <= L; i++) {
                page_links.push(_pagelink(i))
            }
        } else {
            // the first number (1) and dots if list too long
            page_links.push(_pagelink(1))
            page_links.push(_pagelink(2, P <= 1 + 2 + B))

            // limit the beginning and end numbers to be appropriate ranges
            const i0 = Math.min(L - 2 - 2 * B, Math.max(1 + 2, P - B))
            const i1 = Math.max(1 + 2 + 2 * B, Math.min(L - 2, P + B))
            for (let i = i0; i <= i1; i++) {
                page_links.push(_pagelink(i))
            }

            // the last number (-1) and dots if list too long
            page_links.push(_pagelink(L - 1, P >= L - 2 - B))
            page_links.push(_pagelink(L - 0))
        }

        page_links.push(_inclink(+1))

        return (
            <div className='center bib-pager'>
              <span>
                <span>Pages:</span>
                <ul className='bib-page-list'>{page_links}</ul>
                <label htmlFor='bib-jump-label'>Skip: </label>
                <select id='bib-jump-label' value={this.page}
                    onChange={(e) => this.page = parseInt(e.target.value, 10) }>
                { [...Array(L).keys()].map( i => <option value={i + 1}>{i + 1}</option>)}
                </select>
              </span>
            </div >
        )
    }
}
