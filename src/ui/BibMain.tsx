import { observer } from 'mobx-react'
import * as React from 'react'
import '../App.css'
import { BibModel } from '../model/BibModel'
import { ColumnView } from './ColumnView'
import { spinner } from './Spinner'

function pageElement(name: string, container: string,  insertbefore: string): HTMLElement {
    const onpage = document.getElementById(name)
    if (onpage) {
        return onpage
    }

    const main = document.createElement('div')
    main.id = name
    main.className = name

    const elemContainer = document.getElementsByClassName(container)[0]
    const elemInsertBefore = document.getElementsByClassName(insertbefore)[0]
    elemContainer.insertBefore(main, elemInsertBefore)
    return main as HTMLElement
}

export function pageElementMain(): HTMLElement {
    return pageElement('bib-main', 'leftcolumn', 'submission-history')
}

export function pageElementSidebar(): HTMLElement {
    return pageElement('bib-sidebar', 'extra-services', 'bookmarks')
}

@observer
export class BibMain extends React.Component<{bibModel: BibModel}, {}> {
    render() {                
        const bib = this.props.bibModel
        const ds = bib.currentDS

        if (!ds) {
            return spinner()
        }

        const sources = bib.availableDS.map(
            (i): JSX.Element => {
                if (bib.currentDS === i) {
                    return <span className='bib-selected'>{i.longname}</span>
                } else {
                    return <span><a href='javascript:;' onClick={() => bib.setDS(i)}>{i.longname}</a></span>
                }
            }
        ).reduce(
            (accu, elem) => accu === null ? elem : (<span>{accu}<span> | </span>{elem}</span>)
        )

        const source_list = (<div><span>Select data provider: </span>{sources}</div>)
        const msg_list = (<div></div>)

        if (!bib.references && !bib.citations) {
            return spinner()
        } else {
            return(
                <div className='bib-main'>
                  <div className='references-citations'>
                    <h2>References and citations</h2>
                    <div className='references-citations-boxes'>
                      <div className='bib-sidebar-source'>{source_list}</div>
                      <div className='bib-sidebar-msgs'>{msg_list}</div>
                    </div>
                    <span>[<a id='biboverlay_toggle' href='javascript:;'>Disable</a></span>
                    <span> (<a href='/help/bibex/'>What is this?</a>)]</span>
                  </div>
                  <div className='bib-col2'>
                    <ColumnView name='References' paperGroup={bib.references} dataSource={ds}/>
                    <ColumnView name='Citations' paperGroup={bib.citations} dataSource={ds}/>
                  </div>
                </div>
            )
        }        
    }
}
