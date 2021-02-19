import "./namespace-select.scss";

import React from "react";
import { computed } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { Select, SelectOption, SelectProps } from "../select";
import { cssNames } from "../../utils";
import { Icon } from "../icon";
import { namespaceStore } from "./namespace.store";
import { kubeWatchApi } from "../../api/kube-watch-api";

interface Props extends SelectProps {
  /**
   * Show icons preceeding the entry names
   * @default true
   */
  showIcons?: boolean;

  /**
   * show a "Cluster" option above all namespaces
   * @default false
   */
  showClusterOption?: boolean;

  /**
   * show "All namespaces" option on the top (has precedence over `showClusterOption`)
   * @default false
   */
  showAllNamespacesOption?: boolean;

  /**
   * A function to change the options for the select
   * @param options the current options to display
   * @default passthrough
   */
  customizeOptions?(options: SelectOption[]): SelectOption[];
}

@observer
export class NamespaceSelect extends React.Component<Props> {
  static defaultProps: Props = {
    showIcons: true,
    showClusterOption: false,
    showAllNamespacesOption: false,
    customizeOptions: (opts) => opts,
  };

  componentDidMount() {
    disposeOnUnmount(this, [
      kubeWatchApi.subscribeStores([namespaceStore], {
        preload: true,
      })
    ]);
  }

  @computed.struct get options(): SelectOption[] {
    const { customizeOptions, showClusterOption, showAllNamespacesOption } = this.props;
    const options: SelectOption[] = namespaceStore.allowedNamespaces.map(ns => ({ value: ns }));

    if (showAllNamespacesOption) {
      options.unshift({ label: "All Namespaces", value: "" });
    } else if (showClusterOption) {
      options.unshift({ label: "Cluster", value: "" });
    }

    return customizeOptions(options);
  }

  formatOptionLabel = (option: SelectOption) => {
    const { showIcons } = this.props;
    const { value, label } = option;

    return label || (
      <>
        {showIcons && <Icon small material="layers"/>}
        {value}
      </>
    );
  };

  render() {
    const { className, showIcons, customizeOptions, ...selectProps } = this.props;

    return (
      <Select
        className={cssNames("NamespaceSelect", className)}
        menuClass="NamespaceSelectMenu"
        formatOptionLabel={this.formatOptionLabel}
        options={this.options}
        {...selectProps}
      />
    );
  }
}
